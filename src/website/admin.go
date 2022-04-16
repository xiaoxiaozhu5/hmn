package website

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"git.handmade.network/hmn/hmn/src/auth"
	"git.handmade.network/hmn/hmn/src/config"
	"git.handmade.network/hmn/hmn/src/db"
	"git.handmade.network/hmn/hmn/src/hmndata"
	"git.handmade.network/hmn/hmn/src/hmnurl"
	"git.handmade.network/hmn/hmn/src/models"
	"git.handmade.network/hmn/hmn/src/oops"
	"git.handmade.network/hmn/hmn/src/templates"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v4/pgxpool"
)

type AdminAtomFeedData struct {
	Title    string
	Subtitle string

	HomepageUrl string
	AtomFeedUrl string
	FeedUrl     string

	CopyrightStatement string
	SiteVersion        string
	Updated            time.Time
	FeedID             string

	Posts []templates.PostListItem
}

func AdminAtomFeed(c *RequestContext) ResponseData {
	creds := fmt.Sprintf("%s:%s", config.Config.Admin.AtomUsername, config.Config.Admin.AtomPassword)
	expectedAuth := fmt.Sprintf("Basic %s", base64.StdEncoding.EncodeToString([]byte(creds)))
	auth, hasAuth := c.Req.Header["Authorization"]
	if !hasAuth {
		res := ResponseData{
			StatusCode: http.StatusUnauthorized,
		}
		res.Header().Set("WWW-Authenticate", "Basic realm=\"Admin\"")
		return res
	} else if auth[0] != expectedAuth {
		return FourOhFour(c)
	}

	feedData := AdminAtomFeedData{
		HomepageUrl:        hmnurl.BuildHomepage(),
		CopyrightStatement: fmt.Sprintf("Copyright (C) 2014-%d Handmade.Network and its contributors", time.Now().Year()),
		SiteVersion:        "2.0",
		Title:              "Handmade Network Admin feed",
		Subtitle:           "Unapproved user posts",
		FeedID:             uuid.NewSHA1(uuid.NameSpaceURL, []byte(hmnurl.BuildAdminAtomFeed())).URN(),
		AtomFeedUrl:        hmnurl.BuildAdminAtomFeed(),
		FeedUrl:            hmnurl.BuildAdminApprovalQueue(),
	}

	unapprovedPosts, err := fetchUnapprovedPosts(c)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch unapproved posts"))
	}

	c.Perf.StartBlock("SQL", "Fetch subforum tree")
	subforumTree := models.GetFullSubforumTree(c.Context(), c.Conn)
	lineageBuilder := models.MakeSubforumLineageBuilder(subforumTree)
	c.Perf.EndBlock()

	for _, post := range unapprovedPosts {
		postItem := MakePostListItem(
			lineageBuilder,
			&post.Project,
			&post.Thread,
			&post.Post,
			&post.Author,
			false,
			true,
			c.Theme,
		)

		postItem.PostTypePrefix = fmt.Sprintf("ADMIN::UNAPPROVED: %s", postItem.PostTypePrefix)
		postItem.UUID = uuid.NewSHA1(uuid.NameSpaceURL, []byte(postItem.Url)).URN()
		postItem.LastEditDate = post.CurrentVersion.Date
		feedData.Posts = append(feedData.Posts, postItem)
	}
	if len(feedData.Posts) > 0 {
		feedData.Updated = feedData.Posts[0].Date
	} else {
		feedData.Updated = time.Now()
	}
	var res ResponseData
	res.MustWriteTemplate("admin_atom.xml", feedData, c.Perf)
	return res
}

const (
	ApprovalQueueActionApprove string = "approve"
	ApprovalQueueActionSpammer string = "spammer"
)

type postWithTitle struct {
	templates.Post
	Title string
}

type adminApprovalQueueData struct {
	templates.BaseData

	UnapprovedUsers []*unapprovedUserData
	SubmitUrl       string
	ApprovalAction  string
	SpammerAction   string
}

type projectWithLinks struct {
	Project templates.Project
	Links   []templates.Link
}

type unapprovedUserData struct {
	User              templates.User
	Date              time.Time
	UserLinks         []templates.Link
	Posts             []postWithTitle
	ProjectsWithLinks []projectWithLinks
}

func AdminApprovalQueue(c *RequestContext) ResponseData {
	c.Perf.StartBlock("SQL", "Fetch subforum tree")
	subforumTree := models.GetFullSubforumTree(c.Context(), c.Conn)
	lineageBuilder := models.MakeSubforumLineageBuilder(subforumTree)
	c.Perf.EndBlock()

	posts, err := fetchUnapprovedPosts(c)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch unapproved posts"))
	}

	projects, err := fetchUnapprovedProjects(c)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch unapproved projects"))
	}

	unapprovedUsers := make([]*unapprovedUserData, 0)
	userIDToDataIdx := make(map[int]int)

	for _, p := range posts {
		var userData *unapprovedUserData
		if idx, ok := userIDToDataIdx[p.Author.ID]; ok {
			userData = unapprovedUsers[idx]
		} else {
			userData = &unapprovedUserData{
				User:      templates.UserToTemplate(&p.Author, c.Theme),
				UserLinks: make([]templates.Link, 0, 10),
			}
			unapprovedUsers = append(unapprovedUsers, userData)
			userIDToDataIdx[p.Author.ID] = len(unapprovedUsers) - 1
		}

		if p.Post.PostDate.After(userData.Date) {
			userData.Date = p.Post.PostDate
		}
		post := templates.PostToTemplate(&p.Post, &p.Author, c.Theme)
		post.AddContentVersion(p.CurrentVersion, &p.Author) // NOTE(asaf): Don't care about editors here
		post.Url = UrlForGenericPost(hmndata.UrlContextForProject(&p.Project), &p.Thread, &p.Post, lineageBuilder)
		userData.Posts = append(userData.Posts, postWithTitle{
			Post:  post,
			Title: p.Thread.Title,
		})
	}

	for _, p := range projects {
		var userData *unapprovedUserData
		if idx, ok := userIDToDataIdx[p.User.ID]; ok {
			userData = unapprovedUsers[idx]
		} else {
			userData = &unapprovedUserData{
				User:      templates.UserToTemplate(p.User, c.Theme),
				UserLinks: make([]templates.Link, 0, 10),
			}
			unapprovedUsers = append(unapprovedUsers, userData)
			userIDToDataIdx[p.User.ID] = len(unapprovedUsers) - 1
		}

		projectLinks := make([]templates.Link, 0, len(p.ProjectLinks))
		for _, l := range p.ProjectLinks {
			projectLinks = append(projectLinks, templates.LinkToTemplate(l))
		}
		if p.ProjectAndStuff.Project.DateCreated.After(userData.Date) {
			userData.Date = p.ProjectAndStuff.Project.DateCreated
		}
		userData.ProjectsWithLinks = append(userData.ProjectsWithLinks, projectWithLinks{
			Project: templates.ProjectAndStuffToTemplate(p.ProjectAndStuff, hmndata.UrlContextForProject(&p.ProjectAndStuff.Project).BuildHomepage(), c.Theme),
			Links:   projectLinks,
		})
	}

	userIds := make([]int, 0, len(unapprovedUsers))
	for _, u := range unapprovedUsers {
		userIds = append(userIds, u.User.ID)
	}

	userLinks, err := db.Query[models.Link](c.Context(), c.Conn,
		`
		SELECT $columns
		FROM
			handmade_links
		WHERE
			user_id = ANY($1)
		ORDER BY ordering ASC
		`,
		userIds,
	)
	if err != nil {
		return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch user links"))
	}

	for _, link := range userLinks {
		userData := unapprovedUsers[userIDToDataIdx[*link.UserID]]
		userData.UserLinks = append(userData.UserLinks, templates.LinkToTemplate(link))
	}

	sort.Slice(unapprovedUsers, func(a, b int) bool {
		return unapprovedUsers[a].Date.After(unapprovedUsers[b].Date)
	})

	data := adminApprovalQueueData{
		BaseData:        getBaseDataAutocrumb(c, "Admin approval queue"),
		UnapprovedUsers: unapprovedUsers,
		SubmitUrl:       hmnurl.BuildAdminApprovalQueue(),
		ApprovalAction:  ApprovalQueueActionApprove,
		SpammerAction:   ApprovalQueueActionSpammer,
	}

	var res ResponseData
	res.MustWriteTemplate("admin_approval_queue.html", data, c.Perf)
	return res
}

func AdminApprovalQueueSubmit(c *RequestContext) ResponseData {
	err := c.Req.ParseForm()
	if err != nil {
		return c.ErrorResponse(http.StatusBadRequest, oops.New(err, "failed to parse admin approval form"))
	}
	action := c.Req.Form.Get("action")
	userIdStr := c.Req.Form.Get("user_id")
	userId, err := strconv.Atoi(userIdStr)
	if err != nil {
		return RejectRequest(c, "User id can't be parsed")
	}

	user, err := db.QueryOne[models.User](c.Context(), c.Conn,
		`
		SELECT $columns{auth_user}
			FROM auth_user
			LEFT JOIN handmade_asset AS auth_user_avatar ON auth_user_avatar.id = auth_user.avatar_asset_id
		WHERE auth_user.id = $1
		`,
		userId,
	)
	if err != nil {
		if errors.Is(err, db.NotFound) {
			return RejectRequest(c, "User not found")
		} else {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to fetch user"))
		}
	}

	whatHappened := ""
	if action == ApprovalQueueActionApprove {
		_, err := c.Conn.Exec(c.Context(),
			`
			UPDATE auth_user
			SET status = $1
			WHERE id = $2
			`,
			models.UserStatusApproved,
			user.ID,
		)
		if err != nil {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to set user to approved"))
		}
		whatHappened = fmt.Sprintf("%s approved successfully", user.Username)
	} else if action == ApprovalQueueActionSpammer {
		_, err := c.Conn.Exec(c.Context(),
			`
			UPDATE auth_user
			SET status = $1
			WHERE id = $2
			`,
			models.UserStatusBanned,
			user.ID,
		)
		if err != nil {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to set user to banned"))
		}
		err = auth.DeleteSessionForUser(c.Context(), c.Conn, user.Username)
		if err != nil {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to log out user"))
		}
		err = deleteAllPostsForUser(c.Context(), c.Conn, user.ID)
		if err != nil {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to delete spammer's posts"))
		}
		err = deleteAllProjectsForUser(c.Context(), c.Conn, user.ID)
		if err != nil {
			return c.ErrorResponse(http.StatusInternalServerError, oops.New(err, "failed to delete spammer's projects"))
		}
		whatHappened = fmt.Sprintf("%s banned successfully", user.Username)
	} else {
		whatHappened = fmt.Sprintf("Unrecognized action: %s", action)
	}

	res := c.Redirect(hmnurl.BuildAdminApprovalQueue(), http.StatusSeeOther)
	res.AddFutureNotice("success", whatHappened)
	return res
}

type UnapprovedPost struct {
	Project        models.Project     `db:"project"`
	Thread         models.Thread      `db:"thread"`
	Post           models.Post        `db:"post"`
	CurrentVersion models.PostVersion `db:"ver"`
	Author         models.User        `db:"author"`
}

func fetchUnapprovedPosts(c *RequestContext) ([]*UnapprovedPost, error) {
	posts, err := db.Query[UnapprovedPost](c.Context(), c.Conn,
		`
		SELECT $columns
		FROM
			handmade_post AS post
			JOIN handmade_project AS project ON post.project_id = project.id
			JOIN handmade_thread AS thread ON post.thread_id = thread.id
			JOIN handmade_postversion AS ver ON ver.id = post.current_id
			JOIN auth_user AS author ON author.id = post.author_id
			LEFT JOIN handmade_asset AS author_avatar ON author_avatar.id = author.avatar_asset_id
		WHERE
			NOT thread.deleted
			AND NOT post.deleted
			AND author.status = ANY($1)
		ORDER BY post.postdate DESC
		`,
		[]models.UserStatus{models.UserStatusConfirmed},
	)
	if err != nil {
		return nil, oops.New(err, "failed to fetch unapproved posts")
	}
	return posts, nil
}

type UnapprovedProject struct {
	User            *models.User
	ProjectAndStuff *hmndata.ProjectAndStuff
	ProjectLinks    []*models.Link
}

func fetchUnapprovedProjects(c *RequestContext) ([]UnapprovedProject, error) {
	ownerIDs, err := db.QueryScalar[int](c.Context(), c.Conn,
		`
		SELECT id
		FROM
			auth_user AS u
		WHERE
			u.status = ANY($1)
		`,
		[]models.UserStatus{models.UserStatusConfirmed},
	)
	if err != nil {
		return nil, oops.New(err, "failed to fetch unapproved users")
	}

	projects, err := hmndata.FetchProjects(c.Context(), c.Conn, c.CurrentUser, hmndata.ProjectsQuery{
		OwnerIDs:      ownerIDs,
		IncludeHidden: true,
	})
	if err != nil {
		return nil, err
	}

	projectIDs := make([]int, 0, len(projects))
	for _, p := range projects {
		projectIDs = append(projectIDs, p.Project.ID)
	}

	projectLinks, err := db.Query[models.Link](c.Context(), c.Conn,
		`
		SELECT $columns
		FROM
			handmade_links AS link
		WHERE
			link.project_id = ANY($1)
		ORDER BY link.ordering ASC
		`,
		projectIDs,
	)
	if err != nil {
		return nil, oops.New(err, "failed to fetch links for projects")
	}

	var result []UnapprovedProject

	for idx, proj := range projects {
		links := make([]*models.Link, 0, 10) // NOTE(asaf): 10 should be enough for most projects.
		for _, link := range projectLinks {
			if *link.ProjectID == proj.Project.ID {
				links = append(links, link)
			}
		}
		for _, u := range proj.Owners {
			if u.Status == models.UserStatusConfirmed {
				result = append(result, UnapprovedProject{
					User:            u,
					ProjectAndStuff: &projects[idx],
					ProjectLinks:    links,
				})
			}
		}
	}

	return result, nil
}

func deleteAllPostsForUser(ctx context.Context, conn *pgxpool.Pool, userId int) error {
	tx, err := conn.Begin(ctx)
	if err != nil {
		return oops.New(err, "failed to start transaction")
	}
	defer tx.Rollback(ctx)
	type toDelete struct {
		ThreadID int `db:"thread.id"`
		PostID   int `db:"post.id"`
	}
	rows, err := db.Query[toDelete](ctx, tx,
		`
		SELECT $columns
		FROM
			handmade_post as post
			JOIN handmade_thread AS thread ON post.thread_id = thread.id
			JOIN auth_user AS author ON author.id = post.author_id
		WHERE author.id = $1
		`,
		userId,
	)

	if err != nil {
		return oops.New(err, "failed to fetch posts to delete for user")
	}

	for _, row := range rows {
		hmndata.DeletePost(ctx, tx, row.ThreadID, row.PostID)
	}
	err = tx.Commit(ctx)
	if err != nil {
		return oops.New(err, "failed to commit transaction")
	}
	return nil
}

func deleteAllProjectsForUser(ctx context.Context, conn *pgxpool.Pool, userId int) error {
	tx, err := conn.Begin(ctx)
	if err != nil {
		return oops.New(err, "failed to start transaction")
	}
	defer tx.Rollback(ctx)

	projectIDsToDelete, err := db.QueryScalar[int](ctx, tx,
		`
		SELECT project.id
		FROM
			handmade_project AS project
			JOIN handmade_user_projects AS up ON up.project_id = project.id
		WHERE
			up.user_id = $1
		`,
		userId,
	)
	if err != nil {
		return oops.New(err, "failed to fetch user's projects")
	}

	if len(projectIDsToDelete) > 0 {
		_, err = tx.Exec(ctx,
			`
			DELETE FROM handmade_project WHERE id = ANY($1)
			`,
			projectIDsToDelete,
		)
		if err != nil {
			return oops.New(err, "failed to delete user's projects")
		}
	}

	err = tx.Commit(ctx)
	if err != nil {
		return oops.New(err, "failed to commit transaction")
	}

	return nil
}
