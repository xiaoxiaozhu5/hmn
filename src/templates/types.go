package templates

import (
	"html/template"
	"time"
)

type BaseData struct {
	Title           string
	CanonicalLink   string
	OpenGraphItems  []OpenGraphItem
	BackgroundImage BackgroundImage
	Theme           string
	BodyClasses     []string
	Breadcrumbs     []Breadcrumb

	Project Project
	User    *User
}

type Thread struct {
	Title string

	Locked bool
	Sticky bool
}

type Post struct {
	ID  int
	Url string

	Preview  string
	ReadOnly bool

	Author   *User
	Content  template.HTML
	PostDate time.Time

	Editor     *User
	EditDate   time.Time
	EditIP     string
	EditReason string

	IP string
}

type Project struct {
	Name      string
	Subdomain string
	Color1    string
	Color2    string

	IsHMN bool

	HasBlog    bool
	HasForum   bool
	HasWiki    bool
	HasLibrary bool
}

type User struct {
	ID          int
	Username    string
	Email       string
	IsSuperuser bool
	IsStaff     bool

	Name       string
	Blurb      string
	Bio        string
	Signature  string
	AvatarUrl  string
	ProfileUrl string

	DarkTheme     bool
	Timezone      string
	ProfileColor1 string
	ProfileColor2 string

	CanEditLibrary                      bool
	DiscordSaveShowcase                 bool
	DiscordDeleteSnippetOnMessageDelete bool
}

type OpenGraphItem struct {
	Property string
	Name     string
	Value    string
}

type BackgroundImage struct {
	Url  string
	Size string // A valid CSS background-size value
}

// Data from post_list_item.html
type PostListItem struct {
	Title       string
	Url         string
	Breadcrumbs []Breadcrumb

	User User
	Date time.Time

	Unread  bool
	Classes string
	Content string
}

// Data from thread_list_item.html
type ThreadListItem struct {
	Title       string
	Url         string
	Breadcrumbs []Breadcrumb

	FirstUser User
	FirstDate time.Time
	LastUser  User
	LastDate  time.Time

	Unread  bool
	Classes string
	Content string
}

type Breadcrumb struct {
	Name, Url string
	Current   bool
}

type Pagination struct {
	Current int
	Total   int

	FirstUrl    string
	LastUrl     string
	PreviousUrl string
	NextUrl     string
}
