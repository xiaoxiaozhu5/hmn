document.body.style.overflowY = "scroll";
CineraProps.Orientation = GetRealOrientation(orientations.LANDSCAPE_LEFT, CineraProps.IsMobile);

// Element Selection
//
Nav.Nexus = document.getElementById("cineraIndex");
Nav.Controls.Header = document.getElementById("cineraIndexControl");
Nav.Controls.Sort = Nav.Controls.Header.querySelector(".cineraMenuItem.sort");
Nav.Controls.View = Nav.Controls.Header.querySelector(".cineraMenuItem.view");
Nav.Controls.Anim = Nav.Controls.Header.querySelector(".cineraMenuItem.anim");
Nav.Controls.Save = Nav.Controls.Header.querySelector(".cineraMenuItem.save");
Nav.Controls.Help = Nav.Nexus.querySelector(".cineraHelp");
Nav.Controls.HelpDocumentation = Nav.Controls.Help.querySelector(".help_container");
Nav.GridContainer = Nav.Nexus.querySelector(".cineraIndexGridContainer");
Nav.Controls.GridTraversal.Container = Nav.GridContainer.querySelector(".cineraTraversalContainer");
Nav.Controls.GridTraversal.Header = Nav.GridContainer.querySelector(".cineraTraversal");
Nav.Controls.GridTraversal.Ascend = Nav.Controls.GridTraversal.Header.querySelector(".cineraButton.ascension");
Nav.Controls.GridTraversal.Prev = Nav.Controls.GridTraversal.Header.querySelector(".cineraButton.prev");
Nav.Controls.GridTraversal.Next = Nav.Controls.GridTraversal.Header.querySelector(".cineraButton.next");

Search.QueryElement = document.getElementById("query");
Search.ResultsSummary = document.getElementById("cineraResultsSummary");
Search.ResultsContainer = document.getElementById("cineraResults");
Search.IndexContainer = document.getElementById("cineraIndexList");
Search.ProjectsContainer = Search.IndexContainer.querySelectorAll(".cineraIndexProject");
//
///

// NOTE(matt): Initialisation
//
if(CineraProps.IsMobile)
{
    Nav.Nexus.classList.add("mobile");
}
InitTraversalStack();
InitNexus();
InitHelpKeys(Nav.Controls.HelpDocumentation);
Nav.GridSize = ComputeOptimalGridSize();
SetHelpKeyAvailability(Nav.GridSize);
InitButtons(); // NOTE(matt): Also does "keydown" listeners, needed before UpdateButtons()
UpdateButtons();

InitQuery(Search.QueryElement);
InitPrototypes(Search.ResultsContainer);
prepareProjects();

SyncNavState();
FlipClear("scroll");
//
////

// NOTE(matt): Listeners
//
BindControlKeys();
BindGridKeys(Nav.GridSize);
BindControls();
InitResizeEventListener();
InitOrientationChangeListener();
InitScrollEventListener(Nav.GridContainer, CineraProps.IsMobile, Nav.Controls.Header);
//
////

// NOTE(matt): On-load Execution
//
runSearch();
//
////
