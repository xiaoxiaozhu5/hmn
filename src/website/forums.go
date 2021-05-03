package website

import (
	"context"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"git.handmade.network/hmn/hmn/src/db"
	"git.handmade.network/hmn/hmn/src/hmnurl"
	"git.handmade.network/hmn/hmn/src/models"
	"git.handmade.network/hmn/hmn/src/oops"
	"git.handmade.network/hmn/hmn/src/templates"
	"github.com/jackc/pgx/v4/pgxpool"
)

type forumCategoryData struct {
	templates.BaseData

	CategoryUrl   string
	Threads       []templates.ThreadListItem
	Pagination    templates.Pagination
	Subcategories []forumSubcategoryData
}

type forumSubcategoryData struct {
	Name         string
	Url          string
	Threads      []templates.ThreadListItem
	TotalThreads int
}

func ForumCategory(c *RequestContext) ResponseData {
	const threadsPerPage = 25

	catPath := c.PathParams["cats"]
	catSlugs := strings.Split(catPath, "/")
	currentCatId := fetchCatIdFromSlugs(c.Context(), c.Conn, catSlugs, c.CurrentProject.ID)
	categoryUrls := GetProjectCategoryUrls(c.Context(), c.Conn, c.CurrentProject.ID)

	c.Perf.StartBlock("SQL", "Fetch count of page threads")
	numThreads, err := db.QueryInt(c.Context(), c.Conn,
		`
		SELECT COUNT(*)
		FROM handmade_thread AS thread
		WHERE
			thread.category_id = $1
			AND NOT thread.deleted
		`,
		currentCatId,
	)
	if err != nil {
		panic(oops.New(err, "failed to get count of threads"))
	}
	c.Perf.EndBlock()

	numPages := int(math.Ceil(float64(numThreads) / threadsPerPage))

	page := 1
	pageString, hasPage := c.PathParams["page"]
	if hasPage && pageString != "" {
		if pageParsed, err := strconv.Atoi(pageString); err == nil {
			page = pageParsed
		} else {
			return c.Redirect("/feed", http.StatusSeeOther) // TODO
		}
	}
	if page < 1 || numPages < page {
		return c.Redirect("/feed", http.StatusSeeOther) // TODO
	}

	howManyThreadsToSkip := (page - 1) * threadsPerPage

	var currentUserId *int
	if c.CurrentUser != nil {
		currentUserId = &c.CurrentUser.ID
	}

	c.Perf.StartBlock("SQL", "Fetch page threads")
	type threadQueryResult struct {
		Thread             models.Thread `db:"thread"`
		FirstPost          models.Post   `db:"firstpost"`
		LastPost           models.Post   `db:"lastpost"`
		FirstUser          *models.User  `db:"firstuser"`
		LastUser           *models.User  `db:"lastuser"`
		ThreadLastReadTime *time.Time    `db:"tlri.lastread"`
		CatLastReadTime    *time.Time    `db:"clri.lastread"`
	}
	itMainThreads, err := db.Query(c.Context(), c.Conn, threadQueryResult{},
		`
		SELECT $columns
		FROM
			handmade_thread AS thread
			JOIN handmade_post AS firstpost ON thread.first_id = firstpost.id
			JOIN handmade_post AS lastpost ON thread.last_id = lastpost.id
			LEFT JOIN auth_user AS firstuser ON firstpost.author_id = firstuser.id
			LEFT JOIN auth_user AS lastuser ON lastpost.author_id = lastuser.id
			LEFT JOIN handmade_threadlastreadinfo AS tlri ON (
				tlri.thread_id = thread.id
				AND tlri.user_id = $2
			)
			LEFT JOIN handmade_categorylastreadinfo AS clri ON (
				clri.category_id = $1
				AND clri.user_id = $2
			)
		WHERE
			thread.category_id = $1
			AND NOT thread.deleted
		ORDER BY lastpost.postdate DESC
		LIMIT $3 OFFSET $4
		`,
		currentCatId,
		currentUserId,
		threadsPerPage,
		howManyThreadsToSkip,
	)
	if err != nil {
		panic(oops.New(err, "failed to fetch threads"))
	}
	c.Perf.EndBlock()
	defer itMainThreads.Close()

	makeThreadListItem := func(row *threadQueryResult) templates.ThreadListItem {
		hasRead := false
		if row.ThreadLastReadTime != nil && row.ThreadLastReadTime.After(row.LastPost.PostDate) {
			hasRead = true
		} else if row.CatLastReadTime != nil && row.CatLastReadTime.After(row.LastPost.PostDate) {
			hasRead = true
		}

		return templates.ThreadListItem{
			Title: row.Thread.Title,
			Url:   ThreadUrl(row.Thread, models.CatKindForum, categoryUrls[currentCatId]),

			FirstUser: templates.UserToTemplate(row.FirstUser),
			FirstDate: row.FirstPost.PostDate,
			LastUser:  templates.UserToTemplate(row.LastUser),
			LastDate:  row.LastPost.PostDate,

			Unread: !hasRead,
		}
	}

	var threads []templates.ThreadListItem
	for _, irow := range itMainThreads.ToSlice() {
		row := irow.(*threadQueryResult)
		threads = append(threads, makeThreadListItem(row))
	}

	// ---------------------
	// Subcategory things
	// ---------------------

	var subcats []forumSubcategoryData
	if page == 1 {
		c.Perf.StartBlock("SQL", "Fetch subcategories")
		type subcatQueryResult struct {
			Cat models.Category `db:"cat"`
		}
		itSubcats, err := db.Query(c.Context(), c.Conn, subcatQueryResult{},
			`
			SELECT $columns
			FROM
				handmade_category AS cat
			WHERE
				cat.parent_id = $1
			`,
			currentCatId,
		)
		if err != nil {
			panic(oops.New(err, "failed to fetch subcategories"))
		}
		defer itSubcats.Close()
		c.Perf.EndBlock()

		for _, irow := range itSubcats.ToSlice() {
			catRow := irow.(*subcatQueryResult)

			c.Perf.StartBlock("SQL", "Fetch count of subcategory threads")
			numThreads, err := db.QueryInt(c.Context(), c.Conn,
				`
				SELECT COUNT(*)
				FROM handmade_thread AS thread
				WHERE
					thread.category_id = $1
					AND NOT thread.deleted
				`,
				catRow.Cat.ID,
			)
			if err != nil {
				panic(oops.New(err, "failed to get count of threads"))
			}
			c.Perf.EndBlock()

			c.Perf.StartBlock("SQL", "Fetch subcategory threads")
			itThreads, err := db.Query(c.Context(), c.Conn, threadQueryResult{},
				`
				SELECT $columns
				FROM
					handmade_thread AS thread
					JOIN handmade_post AS firstpost ON thread.first_id = firstpost.id
					JOIN handmade_post AS lastpost ON thread.last_id = lastpost.id
					LEFT JOIN auth_user AS firstuser ON firstpost.author_id = firstuser.id
					LEFT JOIN auth_user AS lastuser ON lastpost.author_id = lastuser.id
					LEFT JOIN handmade_threadlastreadinfo AS tlri ON (
						tlri.thread_id = thread.id
						AND tlri.user_id = $2
					)
					LEFT JOIN handmade_categorylastreadinfo AS clri ON (
						clri.category_id = $1
						AND clri.user_id = $2
					)
				WHERE
					thread.category_id = $1
					AND NOT thread.deleted
				ORDER BY lastpost.postdate DESC
				LIMIT 3
				`,
				catRow.Cat.ID,
				currentUserId,
			)
			if err != nil {
				panic(err)
			}
			defer itThreads.Close()
			c.Perf.EndBlock()

			var threads []templates.ThreadListItem
			for _, irow := range itThreads.ToSlice() {
				threadRow := irow.(*threadQueryResult)
				threads = append(threads, makeThreadListItem(threadRow))
			}

			subcats = append(subcats, forumSubcategoryData{
				Name:         *catRow.Cat.Name,
				Url:          categoryUrls[catRow.Cat.ID],
				Threads:      threads,
				TotalThreads: numThreads,
			})
		}
	}

	// ---------------------
	// Template assembly
	// ---------------------

	baseData := getBaseData(c)
	baseData.Title = *c.CurrentProject.Name + " Forums"
	baseData.Breadcrumbs = []templates.Breadcrumb{
		{
			Name: *c.CurrentProject.Name,
			Url:  hmnurl.ProjectUrl("/", nil, c.CurrentProject.Subdomain()),
		},
		{
			Name:    "Forums",
			Url:     categoryUrls[currentCatId],
			Current: true,
		},
	}

	var res ResponseData
	err = res.WriteTemplate("forum_category.html", forumCategoryData{
		BaseData:    baseData,
		CategoryUrl: categoryUrls[currentCatId],
		Threads:     threads,
		Pagination: templates.Pagination{
			Current: page,
			Total:   numPages,

			FirstUrl:    categoryUrls[currentCatId],
			LastUrl:     fmt.Sprintf("%s/%d", categoryUrls[currentCatId], numPages),
			NextUrl:     fmt.Sprintf("%s/%d", categoryUrls[currentCatId], page+1),
			PreviousUrl: fmt.Sprintf("%s/%d", categoryUrls[currentCatId], page-1),
		},
		Subcategories: subcats,
	}, c.Perf)
	if err != nil {
		panic(err)
	}

	return res
}

func fetchCatIdFromSlugs(ctx context.Context, conn *pgxpool.Pool, catSlugs []string, projectId int) int {
	if len(catSlugs) == 1 {
		var err error
		currentCatId, err := db.QueryInt(ctx, conn,
			`
			SELECT cat.id
			FROM
				handmade_category AS cat
				JOIN handmade_project AS proj ON proj.forum_id = cat.id
			WHERE
				proj.id = $1
				AND cat.kind = $2
			`,
			projectId,
			models.CatKindForum,
		)
		if err != nil {
			panic(oops.New(err, "failed to get root category id"))
		}

		return currentCatId
	} else {
		var err error
		currentCatId, err := db.QueryInt(ctx, conn,
			`
			SELECT id
			FROM handmade_category
			WHERE
				slug = $1
				AND kind = $2
				AND project_id = $3
			`,
			catSlugs[len(catSlugs)-1],
			models.CatKindForum,
			projectId,
		)
		if err != nil {
			panic(oops.New(err, "failed to get current category id"))
		}

		return currentCatId
	}
}
