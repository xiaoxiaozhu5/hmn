package hmnurl

import (
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"git.handmade.network/hmn/hmn/src/oops"
)

/*
Any function in this package whose name starts with Build is required to be covered by a test.
This helps ensure that we don't generate URLs that can't be routed.
*/

// TODO(asaf): Make this whole file only crash in Dev

var RegexHomepage = regexp.MustCompile("^/$")

func BuildHomepage() string {
	return Url("/", nil)
}

func BuildProjectHomepage(projectSlug string) string {
	return ProjectUrl("/", nil, projectSlug)
}

var RegexProjectIndex = regexp.MustCompile("^/projects$")

func BuildProjectIndex() string {
	return Url("/projects", nil)
}

var RegexShowcase = regexp.MustCompile("^/showcase$")

func BuildShowcase() string {
	return Url("/showcase", nil)
}

var RegexStreams = regexp.MustCompile("^/streams$")

func BuildStreams() string {
	return Url("/streams", nil)
}

var RegexSiteMap = regexp.MustCompile("^/sitemap$")

func BuildSiteMap() string {
	return Url("/sitemap", nil)
}

var RegexAtomFeed = regexp.MustCompile("^/atom$")

func BuildAtomFeed() string {
	return Url("/atom", nil)
}

// QUESTION(ben): Can we change these routes?

var RegexLoginAction = regexp.MustCompile("^/login$")

func BuildLoginAction(redirectTo string) string {
	return Url("/login", []Q{{Name: "redirect", Value: redirectTo}})
}

var RegexLoginPage = regexp.MustCompile("^/_login$")

func BuildLoginPage(redirectTo string) string {
	return Url("/_login", []Q{{Name: "redirect", Value: redirectTo}})
}

var RegexLogoutAction = regexp.MustCompile("^/logout$")

func BuildLogoutAction() string {
	return Url("/logout", nil)
}

/*
* Static Pages
 */

var RegexManifesto = regexp.MustCompile("^/manifesto$")

func BuildManifesto() string {
	return Url("/manifesto", nil)
}

var RegexAbout = regexp.MustCompile("^/about$")

func BuildAbout() string {
	return Url("/about", nil)
}

var RegexCodeOfConduct = regexp.MustCompile("^/code-of-conduct$")

func BuildCodeOfConduct() string {
	return Url("/code-of-conduct", nil)
}

var RegexCommunicationGuidelines = regexp.MustCompile("^/communication-guidelines$")

func BuildCommunicationGuidelines() string {
	return Url("/communication-guidelines", nil)
}

var RegexContactPage = regexp.MustCompile("^/contact$")

func BuildContactPage() string {
	return Url("/contact", nil)
}

var RegexMonthlyUpdatePolicy = regexp.MustCompile("^/monthly-update-policy$")

func BuildMonthlyUpdatePolicy() string {
	return Url("/monthly-update-policy", nil)
}

var RegexProjectSubmissionGuidelines = regexp.MustCompile("^/project-guidelines$")

func BuildProjectSubmissionGuidelines() string {
	return Url("/project-guidelines", nil)
}

/*
* Member
 */

var RegexMember = regexp.MustCompile(`^/m/(?P<member>[^/]+)$`)

func BuildMember(username string) string {
	if len(username) == 0 {
		panic(oops.New(nil, "Username must not be blank"))
	}
	return Url("/m/"+username, nil)
}

/*
* Feed
 */

var RegexFeed = regexp.MustCompile(`^/feed(/(?P<page>.+)?)?$`)

func BuildFeed() string {
	return Url("/feed", nil)
}

func BuildFeedWithPage(page int) string {
	if page < 1 {
		panic(oops.New(nil, "Invalid feed page (%d), must be >= 1", page))
	}
	if page == 1 {
		return BuildFeed()
	}
	return Url("/feed/"+strconv.Itoa(page), nil)
}

/*
* Podcast
 */

var RegexPodcast = regexp.MustCompile(`^/podcast$`)

func BuildPodcast(projectSlug string) string {
	return ProjectUrl("/podcast", nil, projectSlug)
}

/*
* Forums
 */

// TODO(asaf): This also matches urls generated by BuildForumThread (/t/ is identified as a cat, and the threadid as a page)
// This shouldn't be a problem since we will match Thread before Category in the router, but should we enforce it here?
var RegexForumCategory = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?(/(?P<page>\d+))?$`)

func BuildForumCategory(projectSlug string, subforums []string, page int) string {
	if page < 1 {
		panic(oops.New(nil, "Invalid forum thread page (%d), must be >= 1", page))
	}

	builder := buildForumCategoryPath(subforums)

	if page > 1 {
		builder.WriteRune('/')
		builder.WriteString(strconv.Itoa(page))
	}

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexForumNewThread = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/new?$`)

func BuildForumNewThread(projectSlug string, subforums []string) string {
	builder := buildForumCategoryPath(subforums)
	builder.WriteString("/new")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexForumThread = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/t/(?P<threadid>\d+)(-([^/]+))?(/(?P<page>\d+))?$`)

func BuildForumThread(projectSlug string, subforums []string, threadId int, title string, page int) string {
	builder := buildForumThreadPath(subforums, threadId, title, page)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

func BuildForumThreadWithPostHash(projectSlug string, subforums []string, threadId int, title string, page int, postId int) string {
	builder := buildForumThreadPath(subforums, threadId, title, page)

	return ProjectUrlWithFragment(builder.String(), nil, projectSlug, strconv.Itoa(postId))
}

var RegexForumPost = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/t/(?P<threadid>\d+)/p/(?P<postid>\d+)$`)

func BuildForumPost(projectSlug string, subforums []string, threadId int, postId int) string {
	builder := buildForumPostPath(subforums, threadId, postId)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexForumPostDelete = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/t/(?P<threadid>\d+)/p/(?P<postid>\d+)/delete$`)

func BuildForumPostDelete(projectSlug string, subforums []string, threadId int, postId int) string {
	builder := buildForumPostPath(subforums, threadId, postId)
	builder.WriteString("/delete")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexForumPostEdit = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/t/(?P<threadid>\d+)/p/(?P<postid>\d+)/edit$`)

func BuildForumPostEdit(projectSlug string, subforums []string, threadId int, postId int) string {
	builder := buildForumPostPath(subforums, threadId, postId)
	builder.WriteString("/edit")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexForumPostReply = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/t/(?P<threadid>\d+)/p/(?P<postid>\d+)/reply$`)

// TODO: It's kinda weird that we have "replies" to a specific post. That's not how the data works. I guess this just affects what you see as the "post you're replying to" on the post composer page?
func BuildForumPostReply(projectSlug string, subforums []string, threadId int, postId int) string {
	builder := buildForumPostPath(subforums, threadId, postId)
	builder.WriteString("/reply")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexForumPostQuote = regexp.MustCompile(`^/forums(/(?P<cats>[^\d/]+(/[^\d]+)*))?/t/(?P<threadid>\d+)/p/(?P<postid>\d+)/quote$`)

func BuildForumPostQuote(projectSlug string, subforums []string, threadId int, postId int) string {
	builder := buildForumPostPath(subforums, threadId, postId)
	builder.WriteString("/quote")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

/*
* Blog
 */

var RegexBlogsRedirect = regexp.MustCompile(`^/blogs`)

var RegexBlog = regexp.MustCompile(`^/blog(/(?P<page>\d+))?$`)

func BuildBlog(projectSlug string, page int) string {
	if page < 1 {
		panic(oops.New(nil, "Invalid blog page (%d), must be >= 1", page))
	}
	path := "/blog"

	if page > 1 {
		path += "/" + strconv.Itoa(page)
	}

	return ProjectUrl(path, nil, projectSlug)
}

var RegexBlogThread = regexp.MustCompile(`^/blog/p/(?P<threadid>\d+)(-([^/]+))?(/(?P<page>\d+))?$`)

func BuildBlogThread(projectSlug string, threadId int, title string, page int) string {
	builder := buildBlogThreadPath(threadId, title, page)
	return ProjectUrl(builder.String(), nil, projectSlug)
}

func BuildBlogThreadWithPostHash(projectSlug string, threadId int, title string, page int, postId int) string {
	builder := buildBlogThreadPath(threadId, title, page)
	return ProjectUrlWithFragment(builder.String(), nil, projectSlug, strconv.Itoa(postId))
}

var RegexBlogPost = regexp.MustCompile(`^/blog/p/(?P<threadid>\d+)/e/(?P<postid>\d+)$`)

func BuildBlogPost(projectSlug string, threadId int, postId int) string {
	builder := buildBlogPostPath(threadId, postId)
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexBlogPostDelete = regexp.MustCompile(`^/blog/p/(?P<threadid>\d+)/e/(?P<postid>\d+)/delete$`)

func BuildBlogPostDelete(projectSlug string, threadId int, postId int) string {
	builder := buildBlogPostPath(threadId, postId)
	builder.WriteString("/delete")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexBlogPostEdit = regexp.MustCompile(`^/blog/p/(?P<threadid>\d+)/e/(?P<postid>\d+)/edit$`)

func BuildBlogPostEdit(projectSlug string, threadId int, postId int) string {
	builder := buildBlogPostPath(threadId, postId)
	builder.WriteString("/edit")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexBlogPostReply = regexp.MustCompile(`^/blog/p/(?P<threadid>\d+)/e/(?P<postid>\d+)/reply$`)

func BuildBlogPostReply(projectSlug string, threadId int, postId int) string {
	builder := buildBlogPostPath(threadId, postId)
	builder.WriteString("/reply")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexBlogPostQuote = regexp.MustCompile(`^/blog/p/(?P<threadid>\d+)/e/(?P<postid>\d+)/quote$`)

func BuildBlogPostQuote(projectSlug string, threadId int, postId int) string {
	builder := buildBlogPostPath(threadId, postId)
	builder.WriteString("/quote")
	return ProjectUrl(builder.String(), nil, projectSlug)
}

/*
* Wiki
 */

var RegexWiki = regexp.MustCompile(`^/wiki$`)

func BuildWiki(projectSlug string) string {
	return ProjectUrl("/wiki", nil, projectSlug)
}

var RegexWikiIndex = regexp.MustCompile(`^/wiki/index$`)

func BuildWikiIndex(projectSlug string) string {
	return ProjectUrl("/wiki/index", nil, projectSlug)
}

var RegexWikiArticle = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)(-([^/])+)?$`)

func BuildWikiArticle(projectSlug string, articleId int, title string) string {
	builder := buildWikiArticlePath(articleId, title)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

func BuildWikiArticleWithSectionName(projectSlug string, articleId int, title string, sectionName string) string {
	builder := buildWikiArticlePath(articleId, title)

	return ProjectUrlWithFragment(builder.String(), nil, projectSlug, sectionName)
}

var RegexWikiArticleEdit = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/edit$`)

func BuildWikiArticleEdit(projectSlug string, articleId int) string {
	builder := buildWikiArticlePath(articleId, "")
	builder.WriteString("/edit")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiArticleDelete = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/delete$`)

func BuildWikiArticleDelete(projectSlug string, articleId int) string {
	builder := buildWikiArticlePath(articleId, "")
	builder.WriteString("/delete")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiArticleHistory = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)(-([^/])+)?/history$`)

func BuildWikiArticleHistory(projectSlug string, articleId int, title string) string {
	builder := buildWikiArticlePath(articleId, title)
	builder.WriteString("/history")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiTalk = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)(-([^/])+)?/talk$`)

func BuildWikiTalk(projectSlug string, articleId int, title string) string {
	builder := buildWikiArticlePath(articleId, title)
	builder.WriteString("/talk")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiRevision = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)(-([^/])+)?/(?P<revisionid>\d+)$`)

func BuildWikiRevision(projectSlug string, articleId int, title string, revisionId int) string {
	if revisionId < 1 {
		panic(oops.New(nil, "Invalid wiki revision id (%d), must be >= 1", revisionId))
	}
	builder := buildWikiArticlePath(articleId, title)
	builder.WriteRune('/')
	builder.WriteString(strconv.Itoa(revisionId))

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiDiff = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)(-([^/])+)?/diff/(?P<revisionidold>\d+)/(?P<revisionidnew>\d+)$`)

func BuildWikiDiff(projectSlug string, articleId int, title string, revisionIdOld int, revisionIdNew int) string {
	if revisionIdOld < 1 {
		panic(oops.New(nil, "Invalid wiki revision id (%d), must be >= 1", revisionIdOld))
	}

	if revisionIdNew < 1 {
		panic(oops.New(nil, "Invalid wiki revision id (%d), must be >= 1", revisionIdNew))
	}
	builder := buildWikiArticlePath(articleId, title)
	builder.WriteString("/diff/")
	builder.WriteString(strconv.Itoa(revisionIdOld))
	builder.WriteRune('/')
	builder.WriteString(strconv.Itoa(revisionIdNew))

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiTalkPost = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/talk/(?P<postid>\d+)$`)

func BuildWikiTalkPost(projectSlug string, articleId int, postId int) string {
	builder := buildWikiTalkPath(articleId, postId)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiTalkPostDelete = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/talk/(?P<postid>\d+)/delete$`)

func BuildWikiTalkPostDelete(projectSlug string, articleId int, postId int) string {
	builder := buildWikiTalkPath(articleId, postId)
	builder.WriteString("/delete")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiTalkPostEdit = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/talk/(?P<postid>\d+)/edit$`)

func BuildWikiTalkPostEdit(projectSlug string, articleId int, postId int) string {
	builder := buildWikiTalkPath(articleId, postId)
	builder.WriteString("/edit")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiTalkPostReply = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/talk/(?P<postid>\d+)/reply$`)

func BuildWikiTalkPostReply(projectSlug string, articleId int, postId int) string {
	builder := buildWikiTalkPath(articleId, postId)
	builder.WriteString("/reply")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexWikiTalkPostQuote = regexp.MustCompile(`^/wiki/(?P<articleid>\d+)/talk/(?P<postid>\d+)/quote$`)

func BuildWikiTalkPostQuote(projectSlug string, articleId int, postId int) string {
	builder := buildWikiTalkPath(articleId, postId)
	builder.WriteString("/quote")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

/*
* Library
 */

var RegexLibrary = regexp.MustCompile(`^/library$`)

func BuildLibrary(projectSlug string) string {
	return ProjectUrl("/library", nil, projectSlug)
}

var RegexLibraryAll = regexp.MustCompile(`^/library/all$`)

func BuildLibraryAll(projectSlug string) string {
	return ProjectUrl("/library/all", nil, projectSlug)
}

var RegexLibraryTopic = regexp.MustCompile(`^/library/topic/(?P<topicid>\d+)$`)

func BuildLibraryTopic(projectSlug string, topicId int) string {
	if topicId < 1 {
		panic(oops.New(nil, "Invalid library topic ID (%d), must be >= 1", topicId))
	}

	var builder strings.Builder
	builder.WriteString("/library/topic/")
	builder.WriteString(strconv.Itoa(topicId))

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexLibraryResource = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)$`)

func BuildLibraryResource(projectSlug string, resourceId int) string {
	builder := buildLibraryResourcePath(resourceId)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexLibraryDiscussion = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)/d/(?P<threadid>\d+)(/(?P<page>\d+))?$`)

func BuildLibraryDiscussion(projectSlug string, resourceId int, threadId int, page int) string {
	builder := buildLibraryDiscussionPath(resourceId, threadId, page)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

func BuildLibraryDiscussionWithPostHash(projectSlug string, resourceId int, threadId int, page int, postId int) string {
	if postId < 1 {
		panic(oops.New(nil, "Invalid library post ID (%d), must be >= 1", postId))
	}
	builder := buildLibraryDiscussionPath(resourceId, threadId, page)

	return ProjectUrlWithFragment(builder.String(), nil, projectSlug, strconv.Itoa(postId))
}

var RegexLibraryPost = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)/d/(?P<threadid>\d+)/p/(?P<postid>\d+)$`)

func BuildLibraryPost(projectSlug string, resourceId int, threadId int, postId int) string {
	builder := buildLibraryPostPath(resourceId, threadId, postId)

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexLibraryPostDelete = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)/d/(?P<threadid>\d+)/p/(?P<postid>\d+)/delete$`)

func BuildLibraryPostDelete(projectSlug string, resourceId int, threadId int, postId int) string {
	builder := buildLibraryPostPath(resourceId, threadId, postId)
	builder.WriteString("/delete")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexLibraryPostEdit = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)/d/(?P<threadid>\d+)/p/(?P<postid>\d+)/edit$`)

func BuildLibraryPostEdit(projectSlug string, resourceId int, threadId int, postId int) string {
	builder := buildLibraryPostPath(resourceId, threadId, postId)
	builder.WriteString("/edit")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexLibraryPostReply = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)/d/(?P<threadid>\d+)/p/(?P<postid>\d+)/reply$`)

func BuildLibraryPostReply(projectSlug string, resourceId int, threadId int, postId int) string {
	builder := buildLibraryPostPath(resourceId, threadId, postId)
	builder.WriteString("/reply")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

var RegexLibraryPostQuote = regexp.MustCompile(`^/library/resource/(?P<resourceid>\d+)/d/(?P<threadid>\d+)/p/(?P<postid>\d+)/quote$`)

func BuildLibraryPostQuote(projectSlug string, resourceId int, threadId int, postId int) string {
	builder := buildLibraryPostPath(resourceId, threadId, postId)
	builder.WriteString("/quote")

	return ProjectUrl(builder.String(), nil, projectSlug)
}

/*
* Assets
 */

var RegexProjectCSS = regexp.MustCompile("^/assets/project.css$")

func BuildProjectCSS(color string) string {
	return Url("/assets/project.css", []Q{{"color", color}})
}

var RegexPublic = regexp.MustCompile("^/public/.+$")

func BuildPublic(filepath string, cachebust bool) string {
	filepath = strings.Trim(filepath, "/")
	if len(strings.TrimSpace(filepath)) == 0 {
		panic(oops.New(nil, "Attempted to build a /public url with no path"))
	}
	if strings.Contains(filepath, "?") {
		panic(oops.New(nil, "Public url failpath must not contain query params"))
	}
	var builder strings.Builder
	builder.WriteString("/public")
	pathParts := strings.Split(filepath, "/")
	for _, part := range pathParts {
		part = strings.TrimSpace(part)
		if len(part) == 0 {
			panic(oops.New(nil, "Attempted to build a /public url with blank path segments: %s", filepath))
		}
		builder.WriteRune('/')
		builder.WriteString(part)
	}
	var query []Q
	if cachebust {
		query = []Q{{"v", cacheBust}}
	}
	return Url(builder.String(), query)
}

func BuildTheme(filepath string, theme string, cachebust bool) string {
	if len(theme) == 0 {
		panic(oops.New(nil, "Theme can't be blank"))
	}
	return BuildPublic(fmt.Sprintf("themes/%s/%s", theme, strings.Trim(filepath, "/")), cachebust)
}

/*
* Other
 */

var RegexMarkRead = regexp.MustCompile(`^/_markread/(?P<catid>\d+)$`)

// NOTE(asaf): categoryId == 0 means ALL CATEGORIES
func BuildMarkRead(categoryId int) string {
	if categoryId < 0 {
		panic(oops.New(nil, "Invalid category ID (%d), must be >= 0", categoryId))
	}

	var builder strings.Builder
	builder.WriteString("/_markread/")
	builder.WriteString(strconv.Itoa(categoryId))

	return Url(builder.String(), nil)
}

var RegexCatchAll = regexp.MustCompile("")

/*
* Helper functions
 */

func buildForumCategoryPath(subforums []string) *strings.Builder {
	for _, subforum := range subforums {
		if strings.Contains(subforum, "/") {
			panic(oops.New(nil, "Tried building forum url with / in subforum name"))
		}
		subforum = strings.TrimSpace(subforum)
		if len(subforum) == 0 {
			panic(oops.New(nil, "Tried building forum url with blank subforum"))
		}
	}

	var builder strings.Builder
	builder.WriteString("/forums")
	for _, subforum := range subforums {
		builder.WriteRune('/')
		builder.WriteString(subforum)
	}

	return &builder
}

func buildForumThreadPath(subforums []string, threadId int, title string, page int) *strings.Builder {
	if page < 1 {
		panic(oops.New(nil, "Invalid forum thread page (%d), must be >= 1", page))
	}

	if threadId < 1 {
		panic(oops.New(nil, "Invalid forum thread ID (%d), must be >= 1", threadId))
	}

	builder := buildForumCategoryPath(subforums)

	builder.WriteString("/t/")
	builder.WriteString(strconv.Itoa(threadId))
	if len(title) > 0 {
		builder.WriteRune('-')
		builder.WriteString(PathSafeTitle(title))
	}
	if page > 1 {
		builder.WriteRune('/')
		builder.WriteString(strconv.Itoa(page))
	}

	return builder
}

func buildForumPostPath(subforums []string, threadId int, postId int) *strings.Builder {
	if threadId < 1 {
		panic(oops.New(nil, "Invalid forum thread ID (%d), must be >= 1", threadId))
	}

	if postId < 1 {
		panic(oops.New(nil, "Invalid forum post ID (%d), must be >= 1", postId))
	}

	builder := buildForumCategoryPath(subforums)

	builder.WriteString("/t/")
	builder.WriteString(strconv.Itoa(threadId))
	builder.WriteString("/p/")
	builder.WriteString(strconv.Itoa(postId))

	return builder
}

func buildBlogThreadPath(threadId int, title string, page int) *strings.Builder {
	if page < 1 {
		panic(oops.New(nil, "Invalid blog thread page (%d), must be >= 1", page))
	}

	if threadId < 1 {
		panic(oops.New(nil, "Invalid blog thread ID (%d), must be >= 1", threadId))
	}

	var builder strings.Builder

	builder.WriteString("/blog/p/")
	builder.WriteString(strconv.Itoa(threadId))
	if len(title) > 0 {
		builder.WriteRune('-')
		builder.WriteString(PathSafeTitle(title))
	}
	if page > 1 {
		builder.WriteRune('/')
		builder.WriteString(strconv.Itoa(page))
	}

	return &builder
}

func buildBlogPostPath(threadId int, postId int) *strings.Builder {
	if threadId < 1 {
		panic(oops.New(nil, "Invalid blog thread ID (%d), must be >= 1", threadId))
	}

	if postId < 1 {
		panic(oops.New(nil, "Invalid blog post ID (%d), must be >= 1", postId))
	}

	var builder strings.Builder

	builder.WriteString("/blog/p/")
	builder.WriteString(strconv.Itoa(threadId))
	builder.WriteString("/e/")
	builder.WriteString(strconv.Itoa(postId))

	return &builder
}

func buildWikiArticlePath(articleId int, title string) *strings.Builder {
	if articleId < 1 {
		panic(oops.New(nil, "Invalid wiki article ID (%d), must be >= 1", articleId))
	}

	var builder strings.Builder

	builder.WriteString("/wiki/")
	builder.WriteString(strconv.Itoa(articleId))
	if len(title) > 0 {
		builder.WriteRune('-')
		builder.WriteString(PathSafeTitle(title))
	}

	return &builder
}

func buildWikiTalkPath(articleId int, postId int) *strings.Builder {
	if postId < 1 {
		panic(oops.New(nil, "Invalid wiki post ID (%d), must be >= 1", postId))
	}

	builder := buildWikiArticlePath(articleId, "")
	builder.WriteString("/talk/")
	builder.WriteString(strconv.Itoa(postId))
	return builder
}

func buildLibraryResourcePath(resourceId int) *strings.Builder {
	if resourceId < 1 {
		panic(oops.New(nil, "Invalid library resource ID (%d), must be >= 1", resourceId))
	}

	var builder strings.Builder
	builder.WriteString("/library/resource/")
	builder.WriteString(strconv.Itoa(resourceId))

	return &builder
}

func buildLibraryDiscussionPath(resourceId int, threadId int, page int) *strings.Builder {
	if page < 1 {
		panic(oops.New(nil, "Invalid page number (%d), must be >= 1", page))
	}
	if threadId < 1 {
		panic(oops.New(nil, "Invalid library thread ID (%d), must be >= 1", threadId))
	}
	builder := buildLibraryResourcePath(resourceId)
	builder.WriteString("/d/")
	builder.WriteString(strconv.Itoa(threadId))
	if page > 1 {
		builder.WriteRune('/')
		builder.WriteString(strconv.Itoa(page))
	}
	return builder
}

func buildLibraryPostPath(resourceId int, threadId int, postId int) *strings.Builder {
	if threadId < 1 {
		panic(oops.New(nil, "Invalid library thread ID (%d), must be >= 1", threadId))
	}
	if postId < 1 {
		panic(oops.New(nil, "Invalid library post ID (%d), must be >= 1", postId))
	}
	builder := buildLibraryResourcePath(resourceId)
	builder.WriteString("/d/")
	builder.WriteString(strconv.Itoa(threadId))
	builder.WriteString("/p/")
	builder.WriteString(strconv.Itoa(postId))
	return builder
}

var PathCharsToClear = regexp.MustCompile("[$&`<>{}()\\[\\]\"+#%@;=?\\\\^|~‘]")
var PathCharsToReplace = regexp.MustCompile("[ :/\\\\]")

func PathSafeTitle(title string) string {
	title = strings.ToLower(title)
	title = PathCharsToReplace.ReplaceAllLiteralString(title, "_")
	title = PathCharsToClear.ReplaceAllLiteralString(title, "")
	title = url.PathEscape(title)
	return title
}