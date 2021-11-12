package website

import (
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"sort"
	"time"

	"git.handmade.network/hmn/hmn/src/db"
	"git.handmade.network/hmn/hmn/src/hmnurl"
	"git.handmade.network/hmn/hmn/src/models"
	"git.handmade.network/hmn/hmn/src/oops"
	"git.handmade.network/hmn/hmn/src/templates"
	"git.handmade.network/hmn/hmn/src/utils"
)

type ProjectTemplateData struct {
	templates.BaseData

	Pagination       templates.Pagination
	CarouselProjects []templates.Project
	Projects         []templates.Project
	PersonalProjects []templates.Project

	ProjectAtomFeedUrl string
	WIPForumUrl        string
}

func ProjectIndex(c *RequestContext) ResponseData {
	const projectsPerPage = 20
	const maxCarouselProjects = 10
	const maxPersonalProjects = 10

	officialProjects, err := FetchProjects(c.Context(), c.Conn, c.CurrentUser, ProjectsQuery{
		Types: OfficialProjects,
	})
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch projects"))
	}

	numPages := int(math.Ceil(float64(len(officialProjects)) / projectsPerPage))
	page, numPages, ok := getPageInfo(c.PathParams["page"], len(officialProjects), feedPostsPerPage)
	if !ok {
		return c.Redirect(hmnurl.BuildProjectIndex(1), http.StatusSeeOther)
	}

	pagination := templates.Pagination{
		Current: page,
		Total:   numPages,

		FirstUrl:    hmnurl.BuildProjectIndex(1),
		LastUrl:     hmnurl.BuildProjectIndex(numPages),
		NextUrl:     hmnurl.BuildProjectIndex(utils.IntClamp(1, page+1, numPages)),
		PreviousUrl: hmnurl.BuildProjectIndex(utils.IntClamp(1, page-1, numPages)),
	}

	c.Perf.StartBlock("PROJECTS", "Grouping and sorting")
	var handmadeHero *templates.Project
	var featuredProjects []templates.Project
	var recentProjects []templates.Project
	var restProjects []templates.Project
	now := time.Now()
	for _, p := range officialProjects {
		templateProject := templates.ProjectToTemplate(&p.Project, UrlContextForProject(&p.Project).BuildHomepage(), c.Theme)
		if p.Project.Slug == "hero" {
			// NOTE(asaf): Handmade Hero gets special treatment. Must always be first in the list.
			handmadeHero = &templateProject
			continue
		}
		if p.Project.Featured {
			featuredProjects = append(featuredProjects, templateProject)
		} else if now.Sub(p.Project.AllLastUpdated).Seconds() < models.RecentProjectUpdateTimespanSec {
			recentProjects = append(recentProjects, templateProject)
		} else {
			restProjects = append(restProjects, templateProject)
		}
	}

	_, randSeed := now.ISOWeek()
	random := rand.New(rand.NewSource(int64(randSeed)))
	random.Shuffle(len(featuredProjects), func(i, j int) { featuredProjects[i], featuredProjects[j] = featuredProjects[j], featuredProjects[i] })
	random.Shuffle(len(recentProjects), func(i, j int) { recentProjects[i], recentProjects[j] = recentProjects[j], recentProjects[i] })
	random.Shuffle(len(restProjects), func(i, j int) { restProjects[i], restProjects[j] = restProjects[j], restProjects[i] })

	if handmadeHero != nil {
		// NOTE(asaf): As mentioned above, inserting HMH first.
		featuredProjects = append([]templates.Project{*handmadeHero}, featuredProjects...)
	}

	orderedProjects := make([]templates.Project, 0, len(featuredProjects)+len(recentProjects)+len(restProjects))
	orderedProjects = append(orderedProjects, featuredProjects...)
	orderedProjects = append(orderedProjects, recentProjects...)
	orderedProjects = append(orderedProjects, restProjects...)

	firstProjectIndex := (page - 1) * projectsPerPage
	endIndex := utils.IntMin(firstProjectIndex+projectsPerPage, len(orderedProjects))
	pageProjects := orderedProjects[firstProjectIndex:endIndex]

	var carouselProjects []templates.Project
	if page == 1 {
		carouselProjects = featuredProjects[:utils.IntMin(len(featuredProjects), maxCarouselProjects)]
	}
	c.Perf.EndBlock()

	// Fetch and highlight a random selection of personal projects
	var personalProjects []templates.Project
	{
		projects, err := FetchProjects(c.Context(), c.Conn, c.CurrentUser, ProjectsQuery{
			Types: PersonalProjects,
		})
		if err != nil {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch personal projects"))
		}

		sort.Slice(projects, func(i, j int) bool {
			p1 := projects[i].Project
			p2 := projects[j].Project
			return p2.AllLastUpdated.Before(p1.AllLastUpdated) // sort backwards - recent first
		})

		for i, p := range projects {
			if i >= maxPersonalProjects {
				break
			}
			personalProjects = append(personalProjects, templates.ProjectToTemplate(
				&p.Project,
				UrlContextForProject(&p.Project).BuildHomepage(),
				c.Theme,
			))
		}
	}

	baseData := getBaseDataAutocrumb(c, "Projects")
	var res ResponseData
	res.MustWriteTemplate("project_index.html", ProjectTemplateData{
		BaseData: baseData,

		Pagination:       pagination,
		CarouselProjects: carouselProjects,
		Projects:         pageProjects,
		PersonalProjects: personalProjects,

		ProjectAtomFeedUrl: hmnurl.BuildAtomFeedForProjects(),
		WIPForumUrl:        hmnurl.HMNProjectContext.BuildForum([]string{"wip"}, 1),
	}, c.Perf)
	return res
}

type ProjectHomepageData struct {
	templates.BaseData
	Project        templates.Project
	Owners         []templates.User
	Screenshots    []string
	ProjectLinks   []templates.Link
	Licenses       []templates.Link
	RecentActivity []templates.TimelineItem
}

func ProjectHomepage(c *RequestContext) ResponseData {
	maxRecentActivity := 15

	if c.CurrentProject == nil {
		return FourOhFour(c)
	}

	// There are no further permission checks to do, because permissions are
	// checked whatever way we fetch the project.

	owners, err := FetchProjectOwners(c.Context(), c.Conn, c.CurrentProject.ID)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, err)
	}

	c.Perf.StartBlock("SQL", "Fetching screenshots")
	type screenshotQuery struct {
		Filename string `db:"screenshot.file"`
	}
	screenshotQueryResult, err := db.Query(c.Context(), c.Conn, screenshotQuery{},
		`
		SELECT $columns
		FROM
			handmade_imagefile AS screenshot
			INNER JOIN handmade_project_screenshots ON screenshot.id = handmade_project_screenshots.imagefile_id
		WHERE
			handmade_project_screenshots.project_id = $1
		`,
		c.CurrentProject.ID,
	)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch screenshots for project"))
	}
	c.Perf.EndBlock()

	c.Perf.StartBlock("SQL", "Fetching project links")
	type projectLinkQuery struct {
		Link models.Link `db:"link"`
	}
	projectLinkResult, err := db.Query(c.Context(), c.Conn, projectLinkQuery{},
		`
		SELECT $columns
		FROM
			handmade_links as link
		WHERE
			link.project_id = $1
		ORDER BY link.ordering ASC
		`,
		c.CurrentProject.ID,
	)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch project links"))
	}
	c.Perf.EndBlock()

	c.Perf.StartBlock("SQL", "Fetch subforum tree")
	subforumTree := models.GetFullSubforumTree(c.Context(), c.Conn)
	lineageBuilder := models.MakeSubforumLineageBuilder(subforumTree)
	c.Perf.EndBlock()

	c.Perf.StartBlock("SQL", "Fetching project timeline")
	type postQuery struct {
		Post   models.Post   `db:"post"`
		Thread models.Thread `db:"thread"`
		Author models.User   `db:"author"`
	}
	postQueryResult, err := db.Query(c.Context(), c.Conn, postQuery{},
		`
		SELECT $columns
		FROM
			handmade_post AS post
			INNER JOIN handmade_thread AS thread ON thread.id = post.thread_id
			INNER JOIN auth_user AS author ON author.id = post.author_id
		WHERE
			post.project_id = $1
		ORDER BY post.postdate DESC
		LIMIT $2
		`,
		c.CurrentProject.ID,
		maxRecentActivity,
	)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch project posts"))
	}
	c.Perf.EndBlock()

	var templateData ProjectHomepageData

	templateData.BaseData = getBaseData(c, c.CurrentProject.Name, nil)
	//if canEdit {
	//	// TODO: Move to project-specific navigation
	//	// templateData.BaseData.Header.EditURL = hmnurl.BuildProjectEdit(project.Slug, "")
	//}
	templateData.BaseData.OpenGraphItems = append(templateData.BaseData.OpenGraphItems, templates.OpenGraphItem{
		Property: "og:description",
		Value:    c.CurrentProject.Blurb,
	})

	templateData.Project = templates.ProjectToTemplate(c.CurrentProject, c.UrlContext.BuildHomepage(), c.Theme)
	for _, owner := range owners {
		templateData.Owners = append(templateData.Owners, templates.UserToTemplate(owner, c.Theme))
	}

	if c.CurrentProject.Hidden {
		templateData.BaseData.AddImmediateNotice(
			"hidden",
			"NOTICE: This project is hidden. It is currently visible only to owners and site admins.",
		)
	}

	if c.CurrentProject.Lifecycle != models.ProjectLifecycleActive {
		switch c.CurrentProject.Lifecycle {
		case models.ProjectLifecycleUnapproved:
			templateData.BaseData.AddImmediateNotice(
				"unapproved",
				fmt.Sprintf(
					"NOTICE: This project has not yet been submitted for approval. It is only visible to owners. Please <a href=\"%s\">submit it for approval</a> when the project content is ready for review.",
					c.UrlContext.BuildProjectEdit("submit"),
				),
			)
		case models.ProjectLifecycleApprovalRequired:
			templateData.BaseData.AddImmediateNotice(
				"unapproved",
				"NOTICE: This project is awaiting approval. It is only visible to owners and site admins.",
			)
		case models.ProjectLifecycleHiatus:
			templateData.BaseData.AddImmediateNotice(
				"hiatus",
				"NOTICE: This project is on hiatus and may not update for a while.",
			)
		case models.ProjectLifecycleDead:
			templateData.BaseData.AddImmediateNotice(
				"dead",
				"NOTICE: Site staff have marked this project as being dead. If you intend to revive it, please contact a member of the Handmade Network staff.",
			)
		case models.ProjectLifecycleLTSRequired:
			templateData.BaseData.AddImmediateNotice(
				"lts-reqd",
				"NOTICE: This project is awaiting approval for maintenance-mode status.",
			)
		case models.ProjectLifecycleLTS:
			templateData.BaseData.AddImmediateNotice(
				"lts",
				"NOTICE: This project has reached a state of completion.",
			)
		}
	}

	for _, screenshot := range screenshotQueryResult.ToSlice() {
		templateData.Screenshots = append(templateData.Screenshots, hmnurl.BuildUserFile(screenshot.(*screenshotQuery).Filename))
	}

	for _, link := range projectLinkResult.ToSlice() {
		templateData.ProjectLinks = append(templateData.ProjectLinks, templates.LinkToTemplate(&link.(*projectLinkQuery).Link))
	}

	for _, post := range postQueryResult.ToSlice() {
		templateData.RecentActivity = append(templateData.RecentActivity, PostToTimelineItem(
			c.UrlContext,
			lineageBuilder,
			&post.(*postQuery).Post,
			&post.(*postQuery).Thread,
			&post.(*postQuery).Author,
			c.Theme,
		))
	}

	tagId := -1
	if c.CurrentProject.TagID != nil {
		tagId = *c.CurrentProject.TagID
	}

	snippets, err := FetchSnippets(c.Context(), c.Conn, c.CurrentUser, SnippetQuery{
		Tags: []int{tagId},
	})
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch project snippets"))
	}
	for _, s := range snippets {
		item := SnippetToTimelineItem(
			&s.Snippet,
			s.Asset,
			s.DiscordMessage,
			s.Tags,
			s.Owner,
			c.Theme,
		)
		item.SmallInfo = true
		templateData.RecentActivity = append(templateData.RecentActivity, item)
	}

	c.Perf.StartBlock("PROFILE", "Sort timeline")
	sort.Slice(templateData.RecentActivity, func(i, j int) bool {
		return templateData.RecentActivity[j].Date.Before(templateData.RecentActivity[i].Date)
	})
	c.Perf.EndBlock()

	var res ResponseData
	err = res.WriteTemplate("project_homepage.html", templateData, c.Perf)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to render project homepage template"))
	}
	return res
}
