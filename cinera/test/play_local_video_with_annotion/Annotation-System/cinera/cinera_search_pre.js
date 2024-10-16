// Processing (Searching / Filtering)
//
var CineraProps = {
    IsMobile: IsMobile(),
    Orientation: null,
};

var Search = {
    ResultsSummary: null,
    ResultsContainer: null,
    ProjectsContainer: null,
    QueryElement: null,

    Projects: [],

    LastQuery: null,
    MarkerList: null,
    ProjectContainer: null,
    ResultsMarkerIndex: -1,
    RenderHandle: undefined,
    Rendering: false,

    Prototypes: {
        ProjectContainer: null,
        DayContainer: null,
        Marker: null,
        Highlight: null,
    }
};

function hideEntriesOfProject(ProjectElement)
{
    if(!ProjectElement.classList.contains("off"))
    {
        ProjectElement.classList.add("off");
    }
    var baseURL = ProjectElement.attributes.getNamedItem("data-baseURL").value;
    var searchLocation = ProjectElement.attributes.getNamedItem("data-searchLocation").value;
    var playerLocation = ProjectElement.attributes.getNamedItem("data-playerLocation").value;
    for(var i = 0; i < Search.Projects.length; ++i)
    {
        var ThisProject = Search.Projects[i];
        if(baseURL === ThisProject.baseURL && searchLocation === ThisProject.searchLocation && playerLocation === ThisProject.playerLocation)
        {
            ThisProject.filteredOut = true;
            if(ThisProject.entriesContainer != null)
            {
                ThisProject.entriesContainer.style.display = "none";
                disableSprite(ThisProject.entriesContainer.parentElement);
            }
        }
    }
}

function showEntriesOfProject(ProjectElement)
{
    if(ProjectElement.classList.contains("off"))
    {
        ProjectElement.classList.remove("off");
    }
    var baseURL = ProjectElement.attributes.getNamedItem("data-baseURL").value;
    var searchLocation = ProjectElement.attributes.getNamedItem("data-searchLocation").value;
    var playerLocation = ProjectElement.attributes.getNamedItem("data-playerLocation").value;
    for(var i = 0; i < Search.Projects.length; ++i)
    {
        var ThisProject = Search.Projects[i];
        if(baseURL === ThisProject.baseURL && searchLocation === ThisProject.searchLocation && playerLocation === ThisProject.playerLocation)
        {
            ThisProject.filteredOut = false;
            if(ThisProject.entriesContainer != null)
            {
                ThisProject.entriesContainer.style.display = "flex";
                enableSprite(ThisProject.entriesContainer.parentElement);
            }
        }
    }
}

function hideProjectSearchResults(baseURL, searchLocation, playerLocation)
{
    var cineraResults = document.getElementById("cineraResults");
    if(cineraResults)
    {
        var cineraResultsProjects = cineraResults.querySelectorAll(".projectContainer");
        for(var i = 0; i < cineraResultsProjects.length; ++i)
        {
            var resultBaseURL = cineraResultsProjects[i].attributes.getNamedItem("data-baseURL").value;
            var resultSearchLocation = cineraResultsProjects[i].attributes.getNamedItem("data-searchLocation").value;
            var resultPlayerLocation = cineraResultsProjects[i].attributes.getNamedItem("data-playerLocation").value;
            if(baseURL === resultBaseURL && searchLocation === resultSearchLocation && playerLocation === resultPlayerLocation)
            {
                cineraResultsProjects[i].style.display = "none";
                return;
            }
        }
    }
}

function showProjectSearchResults(baseURL, searchLocation, playerLocation)
{
    var cineraResults = document.getElementById("cineraResults");
    if(cineraResults)
    {
        var cineraResultsProjects = cineraResults.querySelectorAll(".projectContainer");
        for(var i = 0; i < cineraResultsProjects.length; ++i)
        {
            var resultBaseURL = cineraResultsProjects[i].attributes.getNamedItem("data-baseURL").value;
            var resultSearchLocation = cineraResultsProjects[i].attributes.getNamedItem("data-searchLocation").value;
            var resultPlayerLocation = cineraResultsProjects[i].attributes.getNamedItem("data-playerLocation").value;
            if(baseURL === resultBaseURL && searchLocation === resultSearchLocation && playerLocation === resultPlayerLocation)
            {
                cineraResultsProjects[i].style.display = "flex";
                return;
            }
        }
    }
}

function toggleEntriesOfProjectAndChildren(ProjectFilterElement)
{
    var baseURL = ProjectFilterElement.attributes.getNamedItem("data-baseURL").value;
    var searchLocation = ProjectFilterElement.attributes.getNamedItem("data-searchLocation").value;
    var playerLocation = ProjectFilterElement.attributes.getNamedItem("data-playerLocation").value;
    var shouldShow = ProjectFilterElement.classList.contains("off");
    if(shouldShow)
    {
        ProjectFilterElement.classList.remove("off");
        enableSprite(ProjectFilterElement);
    }
    else
    {
        ProjectFilterElement.classList.add("off");
        disableSprite(ProjectFilterElement);
    }

    for(var i = 0; i < Search.Projects.length; ++i)
    {
        var ThisProject = Search.Projects[i];

        if(baseURL === ThisProject.baseURL && searchLocation === ThisProject.searchLocation && playerLocation === ThisProject.playerLocation)
        {
            if(shouldShow)
            {
                ThisProject.filteredOut = false;
                enableSprite(ThisProject.projectTitleElement.parentElement);
                if(ThisProject.entriesContainer != null)
                {
                    ThisProject.entriesContainer.style.display = "flex";
                }
                showProjectSearchResults(ThisProject.baseURL, ThisProject.searchLocation, ThisProject.playerLocation);
            }
            else
            {
                ThisProject.filteredOut = true;
                disableSprite(ThisProject.projectTitleElement.parentElement);
                if(ThisProject.entriesContainer != null)
                {
                    ThisProject.entriesContainer.style.display = "none";
                }
                hideProjectSearchResults(ThisProject.baseURL, ThisProject.searchLocation, ThisProject.playerLocation);
            }
        }
    }

    var indexChildFilterProjects = ProjectFilterElement.querySelectorAll(".cineraFilterProject");

    for(var j = 0; j < indexChildFilterProjects.length; ++j)
    {
        var ThisElement = indexChildFilterProjects[j];
        var baseURL = ThisElement.attributes.getNamedItem("data-baseURL").value;
        var searchLocation = ThisElement.attributes.getNamedItem("data-searchLocation").value;
        var playerLocation = ThisElement.attributes.getNamedItem("data-playerLocation").value;
        if(shouldShow)
        {
            showEntriesOfProject(ThisElement);
            showProjectSearchResults(baseURL, searchLocation, playerLocation);
        }
        else
        {
            hideEntriesOfProject(ThisElement);
            hideProjectSearchResults(baseURL, searchLocation, playerLocation);
        }
    }
}

function prepareToParseIndexFile(project)
{
    project.xhr.addEventListener("load", function() {
        var contents = project.xhr.response;
        var lines = contents.split("\n");
        var mode = "none";
        var episode = null;
        for (var i = 0; i < lines.length; ++i) {
            var line = lines[i];
            if (line.trim().length == 0) { continue; }
            if (line == "---") {
                if (episode != null && episode.filename != null && episode.number != null && episode.title != null) {
                    episode.day = getEpisodeName(project.unit, episode.number);
                    episode.dayContainerPrototype = project.dayContainerPrototype;
                    episode.markerPrototype = Search.Prototypes.Marker;
                    episode.playerURLPrefix = project.playerURLPrefix;
                    project.episodes.push(episode);
                }
                episode = {};
                mode = "none";
            } else if (line.startsWith("location:")) {
                episode.filename = line.slice(10);
            } else if (line.startsWith("number:")) {
                episode.number = line.slice(8).trim().slice(1, -1);
            } else if (line.startsWith("title:")) {
                episode.title = line.slice(7).trim().slice(1, -1);
            } else if (line.startsWith("markers")) {
                mode = "markers";
                episode.markers = [];
            } else if (mode == "markers") {
                var match = line.match(/"(\d+.\d+)": "(.+)"/);
                if (match == null) {
                    console.log(name, line);
                } else {
                    var totalTime = parseFloat(line.slice(1));
                    var marker = {
                        totalTime: totalTime,
                        prettyTime: markerTime(totalTime),
                        text: match[2].replace(/\\"/g, "\"")
                    }
                    episode.markers.push(marker);
                }
            }
        }
        document.querySelector(".spinner").classList.remove("show");
        project.parsed = true;
        runSearch(true);
    });
    project.xhr.addEventListener("error", function() {
        console.error("Failed to load content");
    });
}

function prepareProjects()
{
    for(var i = 0; i < Search.ProjectsContainer.length; ++i)
    {
        var ID = Search.ProjectsContainer[i].attributes.getNamedItem("data-project").value;
        var baseURL = Search.ProjectsContainer[i].attributes.getNamedItem("data-baseURL").value;
        var searchLocation = Search.ProjectsContainer[i].attributes.getNamedItem("data-searchLocation").value;
        var playerLocation = Search.ProjectsContainer[i].attributes.getNamedItem("data-playerLocation").value;
        var unit = Search.ProjectsContainer[i].attributes.getNamedItem("data-unit").value;
        var theme = Search.ProjectsContainer[i].classList.item(1);

        Search.Projects[i] =
            {
                baseURL: baseURL,
                searchLocation: searchLocation,
                playerLocation: playerLocation,
                unit: unit,
                playerURLPrefix: (baseURL ? baseURL + "/" : "") + (playerLocation ? playerLocation + "/" : ""),
                indexLocation: (baseURL ? baseURL + "/" : "") + (searchLocation ? searchLocation + "/" : "") + ID + ".index",
                projectTitleElement: Search.ProjectsContainer[i].querySelector(":scope > .cineraProjectTitle"),
                entriesContainer: Search.ProjectsContainer[i].querySelector(":scope > .cineraIndexEntries"),
                dayContainerPrototype: Search.Prototypes.DayContainer.cloneNode(true),
                filteredOut: false,
                parsed: false,
                searched: false,
                resultsToRender: [],
                resultsIndex: 0,
                theme: theme,
                episodes: [],
                xhr: new XMLHttpRequest(),
            }

        Search.Projects[i].dayContainerPrototype.classList.add(theme);
        Search.Projects[i].dayContainerPrototype.children[1].classList.add(theme);

        document.querySelector(".spinner").classList.add("show");
        Search.Projects[i].xhr.open("GET", Search.Projects[i].indexLocation);
        Search.Projects[i].xhr.setRequestHeader("Content-Type", "text/plain");
        Search.Projects[i].xhr.send();
        prepareToParseIndexFile(Search.Projects[i]);
    }
}

function getEpisodeName(unit, number) {
    var day = null;
    if(unit)
    {
        day = unit + " " + number;
    }
    return day;
}

function markerTime(totalTime) {
    var markTime = "(";
    var hours = Math.floor(totalTime / 60 / 60);
    var minutes = Math.floor(totalTime / 60) % 60;
    var seconds = Math.floor(totalTime) % 60;
    if (hours > 0) {
        markTime += padTimeComponent(hours) + ":";
    }

    markTime += padTimeComponent(minutes) + ":" + padTimeComponent(seconds) + ")";

    return markTime;
}

function padTimeComponent(component) {
    return (component < 10 ? "0" + component : component);
}

function resetProjectsForSearch()
{
    for(var i = 0; i < Search.Projects.length; ++i)
    {
        var project = Search.Projects[i];
        project.searched = false;
        project.resultsToRender = [];
    }
}

function
IsQuery()
{
    return Search.LastQuery && Search.LastQuery.length > 0;
}

function runSearch(refresh) {
    var queryStr = document.getElementById("query").value;
    if (refresh || Search.LastQuery != queryStr) {
        var oldResultsContainer = Search.ResultsContainer;
        Search.ResultsContainer = oldResultsContainer.cloneNode(false);
        oldResultsContainer.parentNode.insertBefore(Search.ResultsContainer, oldResultsContainer);
        oldResultsContainer.remove();
        for(var i = 0; i < Search.Projects.length; ++i)
        {
            Search.Projects[i].resultsIndex = 0;
        }
        Search.ResultsMarkerIndex = -1;
    }
    Search.LastQuery = queryStr;

    resetProjectsForSearch();

    var numEpisodes = 0;
    var numMarkers = 0;
    var totalSeconds = 0;

    // NOTE(matt):  Function defined within runSearch() so that we can modify numEpisodes, numMarkers and totalSeconds
    function runSearchInterior(resultsToRender, query, episode)
    {
        var matches = [];
        for (var k = 0; k < episode.markers.length; ++k) {
            query.lastIndex = 0;
            var result = query.exec(episode.markers[k].text);
            if (result && result[0].length > 0) {
                numMarkers++;
                matches.push(episode.markers[k]);
                if (k < episode.markers.length-1) {
                    totalSeconds += episode.markers[k+1].totalTime - episode.markers[k].totalTime;
                }
            }
        }
        if (matches.length > 0) {
            numEpisodes++;
            resultsToRender.push({
                query: query,
                episode: episode,
                matches: matches
            });
        }
    }

    if (IsQuery()) {
        switch(Nav.ViewType)
        {
            case view_type.LIST:
                {
                    Nav.List.classList.add("hidden");
                } break;
            case view_type.GRID:
                {
                    Nav.GridContainer.classList.add("hidden");
                } break;
        }
        Search.ResultsSummary.style.display = "block";
        var shouldRender = false;
        var query = new RegExp(Search.LastQuery.replace("(", "\\(").replace(")", "\\)").replace(/\|+/, "\|").replace(/\|$/, "").replace(/(^|[^\\])\\$/, "$1"), "gi");

        // Visible
        for(var i = 0; i < Search.Projects.length; ++i)
        {
            var project = Search.Projects[i];
            if(project.parsed && !project.filteredOut && project.episodes.length > 0) {
                if(Nav.SortChronological)
                {
                    for(var j = 0; j < project.episodes.length; ++j) {
                        var episode = project.episodes[j];
                        runSearchInterior(project.resultsToRender, query, episode);
                    }
                }
                else
                {
                    for(var j = project.episodes.length; j > 0; --j) {
                        var episode = project.episodes[j - 1];
                        runSearchInterior(project.resultsToRender, query, episode);
                    }
                }

                shouldRender = true;
                project.searched = true;

            }
        }

        // Invisible
        for(var i = 0; i < Search.Projects.length; ++i)
        {
            var project = Search.Projects[i];
            if(project.parsed && project.filteredOut && !project.searched && project.episodes.length > 0) {
                if(Nav.SortChronological)
                {
                    for(var j = 0; j < project.episodes.length; ++j) {
                        var episode = project.episodes[j];
                        runSearchInterior(project.resultsToRender, query, episode);
                    }
                }
                else
                {
                    for(var j = project.episodes.length; j > 0; --j) {
                        var episode = project.episodes[j - 1];
                        runSearchInterior(project.resultsToRender, query, episode);
                    }
                }

                shouldRender = true;
                project.searched = true;

            }
        }

        if(shouldRender)
        {
            if (Search.Rendering) {
                clearTimeout(Search.RenderHandle);
            }
            renderResults();
        }
    }
    else
    {
        switch(Nav.ViewType)
        {
            case view_type.LIST:
                {
                    Nav.List.classList.remove("hidden");
                } break;
            case view_type.GRID:
                {
                    Nav.GridContainer.classList.remove("hidden");
                } break;
        }
        Search.ResultsSummary.style.display = "none";
    }

    var totalTime = Math.floor(totalSeconds/60/60) + "h " + Math.floor(totalSeconds/60)%60 + "m " + Math.floor(totalSeconds)%60 + "s ";

    Search.ResultsSummary.textContent = "Found: " + numEpisodes + " episodes, " + numMarkers + " markers, " + totalTime + "total.";
}

function renderResults() {
    var maxItems = 42;
    var numItems = 0;
    for(var i = 0; i < Search.Projects.length; ++i)
    {
        var project = Search.Projects[i];
        if (project.resultsIndex < project.resultsToRender.length) {
            Search.Rendering = true;
            while (numItems < maxItems && project.resultsIndex < project.resultsToRender.length) {
                var query = project.resultsToRender[project.resultsIndex].query;
                var episode = project.resultsToRender[project.resultsIndex].episode;
                var matches = project.resultsToRender[project.resultsIndex].matches;
                if (Search.ResultsMarkerIndex == -1) {
                    if(project.resultsIndex == 0 || project.resultsToRender[project.resultsIndex - 1].episode.playerURLPrefix != episode.playerURLPrefix)
                    {
                        Search.ProjectContainer = Search.Prototypes.ProjectContainer.cloneNode(true);
                        for(var i = 0; i < Search.Projects.length; ++i)
                        {
                            if(Search.Projects[i].playerURLPrefix === episode.playerURLPrefix)
                            {
                                Search.ProjectContainer.setAttribute("data-baseURL", Search.Projects[i].baseURL);
                                Search.ProjectContainer.setAttribute("data-searchLocation", Search.Projects[i].searchLocation);
                                Search.ProjectContainer.setAttribute("data-playerLocation", Search.Projects[i].playerLocation);
                                if(Search.Projects[i].filteredOut)
                                {
                                    Search.ProjectContainer.style.display = "none";
                                }
                            }
                        }
                        Search.ResultsContainer.appendChild(Search.ProjectContainer);
                    }
                    else
                    {
                        Search.ProjectContainer = Search.ResultsContainer.lastElementChild;
                    }


                    var dayContainer = episode.dayContainerPrototype.cloneNode(true);
                    var dayName = dayContainer.children[0];
                    Search.MarkerList = dayContainer.children[1];

                    // TODO(matt):  Maybe prepend the entire lineage?
                    dayName.textContent = (project.projectTitleElement.textContent ? project.projectTitleElement.textContent + " / " : "") + (episode.day ? episode.day + ": " : "") + episode.title;

                    Search.ProjectContainer.appendChild(dayContainer);
                    Search.ResultsMarkerIndex = 0;
                    numItems++;
                }        

                while (numItems < maxItems && Search.ResultsMarkerIndex < matches.length) {
                    var match = matches[Search.ResultsMarkerIndex];
                    var marker = episode.markerPrototype.cloneNode(true);
                    marker.setAttribute("href", episode.playerURLPrefix + episode.filename.replace(/"/g, "") + "/#" + match.totalTime);
                        query.lastIndex = 0;
                        var cursor = 0;
                        var text = match.text;
                        var result = null;
                        marker.appendChild(document.createTextNode(match.prettyTime + " "));
                        while (result = query.exec(text)) {
                            if (result.index > cursor) {
                                marker.appendChild(document.createTextNode(text.slice(cursor, result.index)));
                            }
                            var highlightEl = Search.Prototypes.Highlight.cloneNode();
                            highlightEl.textContent = result[0];
                            marker.appendChild(highlightEl);
                            cursor = result.index + result[0].length;
                        }

                    if (cursor < text.length) {
                        marker.appendChild(document.createTextNode(text.slice(cursor, text.length)));
                    }
                    Search.MarkerList.appendChild(marker);
                    numItems++;
                    Search.ResultsMarkerIndex++;
                }

                if (Search.ResultsMarkerIndex == matches.length) {
                    Search.ResultsMarkerIndex = -1;
                    project.resultsIndex++;
                }
            }
            Search.RenderHandle = setTimeout(renderResults, 0);
        } else {
            Search.Rendering = false;
        }
    }
}

function
InitQuery(QueryElement)
{
    if(location.hash && location.hash.length > 0)
    {
        var initialQuery = location.hash;
        if(initialQuery[0] == "#")
        {
            initialQuery = initialQuery.slice(1);
        }
        QueryElement.value = decodeURIComponent(initialQuery);
    }

    if(document.hasFocus() && IsVisible(QueryElement, GetWindowDim(CineraProps.IsMobile))) { QueryElement.focus(); }
}

function
InitPrototypes(ResultsContainer)
{
    Search.Prototypes.ProjectContainer = document.createElement("DIV");
    Search.Prototypes.ProjectContainer.classList.add("projectContainer");

    Search.Prototypes.DayContainer = document.createElement("DIV");
    Search.Prototypes.DayContainer.classList.add("dayContainer");

    var DayName = document.createElement("SPAN");
    DayName.classList.add("dayName");
    Search.Prototypes.DayContainer.appendChild(DayName);

    var MarkerList = document.createElement("DIV");
    MarkerList.classList.add("markerList");
    Search.Prototypes.DayContainer.appendChild(MarkerList);

    Search.Prototypes.Marker = document.createElement("A");
    Search.Prototypes.Marker.classList.add("marker");
    if(ResultsContainer.getAttribute("data-single") == 0)
    {
        Search.Prototypes.Marker.setAttribute("target", "_blank");
    }

    Search.Prototypes.Highlight = document.createElement("B");
}
//
// Processing (Searching / Filtering)

// Presenting / Navigating (Laying out and traversing the grid, and sorting)
//
var state_bit =
{
    DISABLE_ANIMATIONS: 1 << 0,
    SORT_REVERSED: 1 << 1,
    VIEW_LIST: 1 << 2,
    VIEW_GRID: 1 << 3,

    NO_SAVE: 1 << 31,
};

var siblings = 
{
    PREV: 0,
    NEXT: 1,
};

var item_type =
{
    PROJECT: 0,
    ENTRY: 1,
};

var item_end =
{
    HEAD: 0,
    TAIL: 1,
};

var view_type =
{
    LIST: 0,
    GRID: 1,
};

var transition_type =
{
    SIBLING_SHIFT_PREV:  0,
    SIBLING_SHIFT_NEXT:  1,
    PROJECT_ENTRY:       2,
    PROJECT_EXIT:        3,
    SUBDIVISION_DESCENT: 4,
    SUBDIVISION_ASCENT:  5,
};

var interaction_type =
{
    PUSH_BUTTON: 0,
    SIBLING_SHIFT_PREV: 1,
    SIBLING_SHIFT_NEXT: 2,
    ASCEND: 3,
    SORT: 4,
};

var Nav = {
    Nexus: null,
    GridContainer: null,
    ButtonsContainer: null,
    GridSize: {
        X: null,
        Y: null,
    },
    GridMinCellsPerDimension: 1,
    GridMaxCellsPerDimension: 4,
    GridDim: {
        X: null,
        Y: null,
    },
    MinButtonDim: 100,
    ButtonDim: null,
    GridColumnGap: null,
    GridRowGap: null,

    SortChronological: true,
    ViewType: view_type.LIST,
    List: null,
    Grid: null,

    // NOTE(matt):  Controls
    Controls: {
        Header: null,
        Sort: null,
        View: null,
        Anim: null,
        Save: null,

        Help: null,
        HelpDocumentation: null,
        HelpKeys: [],

        GridTraversal: {
            Container: null,
            Header: null,
            Ascend: null,
            Prev: null,
            PrevAscends: false,
            Next: null,
            NextAscends: false,
        },
    },

    Buttons: [],

    Transition: {
        Enabled: true,
        ButtonsTransitionContainer: null,
        ButtonsContainerCloneElement: null,
        RelevantButtonElement: null,

        StageDurations: [],

        Transforms: {
            ButtonsTransitionContainer: {
                Initial: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                Current: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                TargetStages: [],
            },
            ButtonsContainer: {
                Initial: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                Current: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                TargetStages: [],
            },
            ButtonsContainerClone: {
                Initial: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                Current: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                TargetStages: [],
            },
            RelevantButton: {
                Initial: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                Current: {
                    Pos: { X: 0, Y: 0, },
                    Scale: { X: 1, Y: 1, },
                    Rotation: { X: 0, Y: 0, Z: 0, },
                    Opacity: 1,
                    ScrollX: 0,
                    ZIndex: 0,
                },
                TargetStages: [],
            },
        },

        StartTime: undefined,
        RequestedFrame: undefined,
    },

    InteractionQueue: [],
    TraversalStack: [],
    State: null,
};

function
StateBitIsSet(Bit)
{
    return Nav.State & Bit;
}

function
StateBitIsClear(Bit)
{
    return !(Nav.State & Bit);
}

function
MaintainingState()
{
    return StateBitIsClear(state_bit.NO_SAVE);
}

function
SaveState()
{
    localStorage.setItem("CineraState", Nav.State);
}

function
SetStateBit(Bit)
{
    if(MaintainingState()) { Nav.State |= Bit; SaveState(); }
}

function
ClearStateBit(Bit)
{
    if(MaintainingState()) { Nav.State &= ~Bit; SaveState(); }
}

function
SetHelpKeyAvailability(GridSize)
{
    for(var i = 0; i < Nav.Controls.HelpKeys.length; ++i)
    {
        Nav.Controls.HelpKeys[i].classList.remove("unavailable");
    }

    /* NOTE(matt):  Key layout:
                        0    4    8   12
                        1    5    9   13
                        2    6   10   14
                        3    7   11   15
     */

    if(GridSize.X < 4)
    {
        Nav.Controls.HelpKeys[12].classList.add("unavailable");
        Nav.Controls.HelpKeys[13].classList.add("unavailable");
        Nav.Controls.HelpKeys[14].classList.add("unavailable");
        Nav.Controls.HelpKeys[15].classList.add("unavailable");

        if(GridSize.X < 3)
        {
            Nav.Controls.HelpKeys[8].classList.add("unavailable");
            Nav.Controls.HelpKeys[9].classList.add("unavailable");
            Nav.Controls.HelpKeys[10].classList.add("unavailable");
            Nav.Controls.HelpKeys[11].classList.add("unavailable");

            if(GridSize.X < 2)
            {
                Nav.Controls.HelpKeys[4].classList.add("unavailable");
                Nav.Controls.HelpKeys[5].classList.add("unavailable");
                Nav.Controls.HelpKeys[6].classList.add("unavailable");
                Nav.Controls.HelpKeys[7].classList.add("unavailable");

                if(GridSize.X < 1)
                {
                    Nav.Controls.HelpKeys[0].classList.add("unavailable");
                    Nav.Controls.HelpKeys[1].classList.add("unavailable");
                    Nav.Controls.HelpKeys[2].classList.add("unavailable");
                    Nav.Controls.HelpKeys[3].classList.add("unavailable");
                }
            }
        }
    }

    if(GridSize.Y < 4)
    {
        Nav.Controls.HelpKeys[3].classList.add("unavailable");
        Nav.Controls.HelpKeys[7].classList.add("unavailable");
        Nav.Controls.HelpKeys[11].classList.add("unavailable");
        Nav.Controls.HelpKeys[15].classList.add("unavailable");

        if(GridSize.Y < 3)
        {
            Nav.Controls.HelpKeys[2].classList.add("unavailable");
            Nav.Controls.HelpKeys[6].classList.add("unavailable");
            Nav.Controls.HelpKeys[10].classList.add("unavailable");
            Nav.Controls.HelpKeys[14].classList.add("unavailable");

            if(GridSize.Y < 2)
            {
                Nav.Controls.HelpKeys[1].classList.add("unavailable");
                Nav.Controls.HelpKeys[5].classList.add("unavailable");
                Nav.Controls.HelpKeys[9].classList.add("unavailable");
                Nav.Controls.HelpKeys[13].classList.add("unavailable");

                if(GridSize.Y < 1)
                {
                    Nav.Controls.HelpKeys[0].classList.add("unavailable");
                    Nav.Controls.HelpKeys[4].classList.add("unavailable");
                    Nav.Controls.HelpKeys[8].classList.add("unavailable");
                    Nav.Controls.HelpKeys[12].classList.add("unavailable");
                }
            }
        }
    }
}

function
InitHelpKeys(HelpDocumentation)
{
    var Paragraph = HelpDocumentation.querySelector(".help_paragraph");
    Nav.Controls.HelpKeys = Paragraph.querySelectorAll(".help_key");
}

function
InitView()
{
    // NOTE(matt):  Nav.ViewType is initialised to view_type.LIST and InitNexus() leaves the List View visible
    if(!StateBitIsSet(state_bit.VIEW_LIST))
    {
        if(GridSizeIsSupported(Nav.GridSize))
        {
            PickGridView();
        }
        else
        {
            // NOTE(matt): Silently swap the state bits, leaving the default List View visible
            ClearStateBit(state_bit.VIEW_GRID);
            SetStateBit(state_bit.VIEW_LIST);
        }
    }
}

function
SyncNavState()
{
    Nav.State = localStorage.getItem("CineraState");
    if(Nav.State)
    {
        if(MaintainingState())
        {
            if(StateBitIsSet(state_bit.DISABLE_ANIMATIONS)) { ToggleAnimations(); }
            if(StateBitIsSet(state_bit.SORT_REVERSED)) { Sort(true); }
            InitView();
        }
        else
        {
            Nav.Controls.Save.textContent = "Save Settings: ✘";
            // Nav.ViewType was initialised to view_type.LIST
            if(Nav.ViewType == view_type.GRID && GridSizeIsSupported(Nav.GridSize))
            {
                PickGridView();
            }
        }
    }
    else
    {
        Nav.State = 0;
        switch(Nav.ViewType)
        {
            case view_type.LIST: SetStateBit(state_bit.VIEW_LIST); break
            case view_type.GRID: SetStateBit(state_bit.VIEW_GRID); break
        }
        InitView();
    }
}

function
InitTraversalStack()
{
    Nav.List = document.getElementById("cineraIndexList");

    var Projects = Nav.List.querySelectorAll(":scope > .cineraIndexProject");

    var Level = {
        Projects: null,
        Entries: null,
        HeadIndex: null,
        TailIndex: null,
    }

    if(Projects.length === 1)
    {
        // NOTE(matt): Automatically descend into the lone project
        var QueriedProjects = Projects[0].querySelectorAll(":scope > .cineraIndexProject");
        if(QueriedProjects.length > 0)
        {
            Level.Projects = QueriedProjects;
        }
        Level.Entries = Projects[0].querySelectorAll(":scope > .cineraIndexEntries > div");
    }
    else
    {
        Level.Projects = Projects;
        // NOTE(matt):  The top-level "root" cannot itself contain any entries
    }

    Nav.TraversalStack.push(Level);
}

function
ComputeFullButtonItemCount(ParentItemCount, AvailableButtonCount)
{
    return ParentItemCount > 0 ? Math.ceil(ParentItemCount / AvailableButtonCount) : 0;
}

function
EmptyElement(Element)
{
    while(Element.firstChild) { Element.removeChild(Element.firstChild); }
}

function
SetDim(Element, X, Y)
{
    Element.style.width = X;
    Element.style.height = Y;
}

function
EmptyAndResetButton(Button)
{
    EmptyElement(Button.Element);
    Button.Element.style.fontSize = null;
    Button.Element.style.fontWeight = null;

    SetDim(Button.Element, null, null);

    for(var i = 0; i < Button.Element.classList.length;)
    {
        var Class = Button.Element.classList[i];
        if(Class != "cineraButton" && Class != "subdivision")
        {
            Button.Element.classList.remove(Class);
        }
        else
        {
            ++i;
        }
    }

    Button.Projects = null;
    Button.Entries = null;
    Button.HeadIndex = null;
    Button.TailIndex = null;
}

function
HasPrevSibling(Level)
{
    return Level.HeadIndex && Level.HeadIndex > 0;
}

function
HasNextSibling(Level)
{
    return Level.TailIndex && Level.TailIndex < (Level.Entries ? Level.Entries.length : Level.Projects.length) - 1;
}

function
Diff(A, B)
{
    return Math.abs(A - B);
}

function
SetButtonInfo(NewButton, Prev, Level, Distribution)
{
    var Result = {
        HeadIndex: null,
        TailIndex: null,
        ItemCount: null,
        Theme: null,
    }
    var ItemsToPlace = null;
    var FullButtonItemCount = null;

    if(Distribution.ProjectsToPlace)
    {
        ItemsToPlace = Distribution.ProjectsToPlace;
        FullButtonItemCount = Distribution.FullButtonProjectCount;
    }
    else if(Distribution.EntriesToPlace)
    {
        ItemsToPlace = Distribution.EntriesToPlace;
        FullButtonItemCount = Distribution.FullButtonEntryCount;
        Result.Theme = Level.Entries[0].parentElement.parentElement.classList[1];
    }

    Result.ItemCount = ItemsToPlace > FullButtonItemCount ? FullButtonItemCount : ItemsToPlace;
    if(Result.ItemCount > 0)
    {
        Result.HeadIndex = Prev ? Prev.TailIndex + 1 : Level.HeadIndex ? Level.HeadIndex : 0;
        Result.TailIndex = Result.HeadIndex + Result.ItemCount - 1;
        if(Result.ItemCount > 1)
        {
            if(Result.Theme == null)
            {
                Result.Theme = Level.Projects[Result.HeadIndex].classList[1];
            }
            NewButton.HeadIndex = Result.HeadIndex;
            NewButton.TailIndex = Result.TailIndex;
        }
        else if(Level.Projects && Level.Projects.length > 0)
        {
            if(Distribution.ProjectsToPlace)
            {
                NewButton.Projects = Level.Projects[Result.HeadIndex].querySelectorAll(":scope > .cineraIndexProject");
                Result.Theme = Level.Projects[Result.HeadIndex].classList[1];
            }
            else
            {
                NewButton.Entries = Level.Projects[Result.HeadIndex].querySelectorAll(":scope > .cineraIndexEntries > div");
            }
        }
    }
	return Result;
}

function
ComputeItemDistribution(Level)
{
    var Result = {
        ProjectsToPlace: Level.Projects ? Level.HeadIndex !== null && Level.TailIndex !== null ? Diff(Level.HeadIndex, Level.TailIndex) + 1 : Level.Projects.length : 0,
        ButtonsForProjects: 0,
        FullButtonProjectCount: 0,

        EntriesToPlace: Level.Entries ? Level.HeadIndex !== null && Level.TailIndex !== null ? Diff(Level.HeadIndex, Level.TailIndex) + 1 : Level.Entries.length : 0,
        ButtonsForEntries: 0,
        FullButtonEntryCount: 0,
    };

    // NOTE(matt): Reserving the top row for projects
    if(Result.ProjectsToPlace > 0 && Result.EntriesToPlace > 0)
    {
        Result.ButtonsForProjects = Math.min(Nav.GridSize.X, Result.ProjectsToPlace);
    }
    Result.ButtonsForEntries = Nav.Buttons.length - Result.ButtonsForProjects;
    if(Result.EntriesToPlace < Result.ButtonsForEntries)
    {
        Result.ButtonsForProjects += (Result.ButtonsForEntries - Result.EntriesToPlace);
        Result.ButtonsForEntries = Nav.Buttons.length - Result.ButtonsForProjects;
    }

    Result.FullButtonProjectCount = ComputeFullButtonItemCount(Result.ProjectsToPlace, Result.ButtonsForProjects);
    Result.FullButtonEntryCount = ComputeFullButtonItemCount(Result.EntriesToPlace, Result.ButtonsForEntries);

    return Result;
}

function
ResetTransform(Transform, IgnoreSorting)
{
    Transform.Pos.X = 0;
    Transform.Pos.Y = 0;

    Transform.Scale.X = 1;
    Transform.Scale.Y = 1;

    Transform.Rotation.X = 0;
    Transform.Rotation.Y = 0;
    Transform.Rotation.Z = (Nav.SortChronological || IgnoreSorting) ? 0 : 180;

    Transform.Opacity = 1;

    Transform.ScrollX = 0;

    Transform.ZIndex = null;
}

function
ResetButtonsContainerClone()
{
    EmptyElement(Nav.Transition.ButtonsContainerCloneElement);

    ResetTransform(Nav.Transition.Transforms.ButtonsTransitionContainer.Current, true);
    ResetTransform(Nav.Transition.Transforms.ButtonsTransitionContainer.Initial, true);
    ApplyTransform(Nav.Transition.ButtonsTransitionContainerElement, Nav.Transition.Transforms.ButtonsTransitionContainer.Current);

    ResetTransform(Nav.Transition.Transforms.ButtonsContainer.Current);
    ResetTransform(Nav.Transition.Transforms.ButtonsContainer.Initial);
    ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);

    ResetTransform(Nav.Transition.Transforms.ButtonsContainerClone.Current);
    ResetTransform(Nav.Transition.Transforms.ButtonsContainerClone.Initial);
    ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);

    Nav.Transition.ButtonsContainerCloneElement.style.gridTemplateColumns = Nav.ButtonsContainer.style.gridTemplateColumns;
    Nav.Transition.ButtonsContainerCloneElement.style.gridTemplateRows = Nav.ButtonsContainer.style.gridTemplateRows;

    Nav.Transition.ButtonsContainerCloneElement.style.paddingRight = null;
    Nav.Transition.ButtonsContainerCloneElement.style.paddingLeft = null;
    Nav.Transition.ButtonsContainerCloneElement.style.position = "absolute";

    if(Nav.Transition.RelevantButtonElement)
    {
        ResetTransform(Nav.Transition.Transforms.RelevantButton.Current, true);
        ResetTransform(Nav.Transition.Transforms.RelevantButton.Initial, true);
        ApplyTransform(Nav.Transition.RelevantButtonElement, Nav.Transition.Transforms.RelevantButton.Current);
        Nav.Transition.RelevantButtonElement = null;
    }

    Nav.ButtonsContainer.style.zIndex = 1;
    Nav.ButtonsContainer.style.order = 1;
    Nav.Transition.ButtonsContainerCloneElement.style.order = 0;
    Nav.Transition.ButtonsContainerCloneElement.style.display = "none";
}

function
CloneButtonsContainer()
{
    ResetButtonsContainerClone();
    for(var i = 0; i < Nav.ButtonsContainer.children.length; ++i)
    {
        var ChildClone = Nav.ButtonsContainer.children[i].cloneNode(true);
        Nav.Transition.ButtonsContainerCloneElement.appendChild(ChildClone);
    }

    CopyTransform(Nav.Transition.Transforms.ButtonsContainerClone.Current, Nav.Transition.Transforms.ButtonsContainer.Current);
    ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
    Nav.Transition.ButtonsContainerCloneElement.style.zIndex = 1;
    Nav.Transition.ButtonsContainerCloneElement.style.display = "grid";
}

function
GetIndexOfElement(ParentNodeList, Element)
{
    var Result = null;
    for(var i = 0; i < ParentNodeList.length; ++i)
    {
        if(Element == ParentNodeList[i])
        {
            Result = i;
            break;
        }
    }
    return Result;
}

function
GetIndexOfButton(Button)
{
    var Result = null;
    for(var i = 0; i < Nav.Buttons.length; ++i)
    {
        if(Button == Nav.Buttons[i])
        {
            Result = i
            break;
        }
    }
    return Result;
}

function
ApplyTransform(Element, Transform)
{
    var TranslateStyle = "translate(" + Transform.Pos.X + "px, " + Transform.Pos.Y + "px)";
    var ScaleStyle = "scale(" + Transform.Scale.X + "," + Transform.Scale.Y + ")";
    var RotateX = "rotate3d(1, 0, 0, " + Transform.Rotation.X + "deg)";
    var RotateY = "rotate3d(0, 1, 0, " + Transform.Rotation.Y + "deg)";
    var RotateZ = "rotate3d(0, 0, 1, " + Transform.Rotation.Z + "deg)";
    var RotateStyle = RotateX + " " + RotateY + " " + RotateZ;

    var TransformString = TranslateStyle + " " + ScaleStyle + " " + RotateStyle;

    Element.style.transform = TransformString;
    Element.style.opacity = Transform.Opacity;
    Element.style.zIndex = Transform.ZIndex;

    if(Transform.ScrollX !== null)
    {
        Element.scrollLeft = Transform.ScrollX;
    }
}

function
CopyTransform(Dest, Src)
{
    Dest.Pos.X = Src.Pos.X;
    Dest.Pos.Y = Src.Pos.Y;

    Dest.Scale.X = Src.Scale.X;
    Dest.Scale.Y = Src.Scale.Y;

    Dest.Rotation.X = Src.Rotation.X;
    Dest.Rotation.Y = Src.Rotation.Y;
    Dest.Rotation.Z = Src.Rotation.Z;

    Dest.Opacity = Src.Opacity;

    Dest.ScrollX = Src.ScrollX;

    Dest.ZIndex = Src.ZIndex;
}

function
TransformsMatch(Current, Target)
{
    var Result = true;
    if((Target.Pos.X != null && Target.Pos.X != Current.Pos.X) ||
        (Target.Pos.Y != null && Target.Pos.Y != Current.Pos.Y) ||
        (Target.Scale.X != null && Target.Scale.X != Current.Scale.X) ||
        (Target.Scale.Y != null && Target.Scale.Y != Current.Scale.Y) ||
        (Target.Rotation.X != null && Target.Rotation.X != Current.Rotation.X) ||
        (Target.Rotation.Y != null && Target.Rotation.Y != Current.Rotation.Y) ||
        (Target.Rotation.Z != null && Target.Rotation.Z != Current.Rotation.Z) ||
        (Target.Opacity != null && Target.Opacity != Current.Opacity) ||
        (Target.ScrollX != null && Target.ScrollX != Current.ScrollX) ||
        (Target.ZIndex != null && Target.ZIndex != Current.ZIndex))
    {
        Result = false;
    }
    return Result;
}

function
TransformsComplete(TransformSet)
{
    var Result = true;

    var ButtonsContainer = TransformSet.ButtonsContainer;
    var ButtonsContainerClone = TransformSet.ButtonsContainerClone;
    var ButtonsTransitionContainer = TransformSet.ButtonsTransitionContainer;
    var RelevantButton = TransformSet.RelevantButton;

    if((ButtonsContainer.TargetStages.length && !TransformsMatch(ButtonsContainer.Current, ButtonsContainer.TargetStages[0])) ||
        (ButtonsContainerClone.TargetStages.length && !TransformsMatch(ButtonsContainerClone.Current, ButtonsContainerClone.TargetStages[0])) ||
        (ButtonsTransitionContainer.TargetStages.length && !TransformsMatch(ButtonsTransitionContainer.Current, ButtonsTransitionContainer.TargetStages[0])) ||
        (RelevantButton.TargetStages.length && !TransformsMatch(RelevantButton.Current, RelevantButton.TargetStages[0])))
    {
        Result = false;
    }
    return Result;
}

function
FinaliseTransforms(TransformsSet)
{
    Nav.Transition.StartTime = undefined;
    CopyTransform(TransformsSet.ButtonsTransitionContainer.Initial, TransformsSet.ButtonsTransitionContainer.Current);
    CopyTransform(TransformsSet.ButtonsContainer.Initial, TransformsSet.ButtonsContainer.Current);
    CopyTransform(TransformsSet.ButtonsContainerClone.Initial, TransformsSet.ButtonsContainerClone.Current);
    CopyTransform(TransformsSet.RelevantButton.Initial, TransformsSet.RelevantButton.Current);
    ShiftStage();
}

function
LerpTransforms(TransformSet, t)
{
    var Result = false;
    if(TransformSet.TargetStages.length)
    {
        var Initial = TransformSet.Initial;
        var Current = TransformSet.Current;
        var Target = TransformSet.TargetStages[0];
        if(Target.Pos.X !== null) { Current.Pos.X = Lerp(Initial.Pos.X, t, Target.Pos.X); Result = true; }
        if(Target.Pos.Y !== null) { Current.Pos.Y = Lerp(Initial.Pos.Y, t, Target.Pos.Y); Result = true; }

        if(Target.Scale.X !== null) { Current.Scale.X = Lerp(Initial.Scale.X, t, Target.Scale.X); Result = true; }
        if(Target.Scale.Y !== null) { Current.Scale.Y = Lerp(Initial.Scale.Y, t, Target.Scale.Y); Result = true; }

        if(Target.Rotation.X !== null) { Current.Rotation.X = Lerp(Initial.Rotation.X, t, Target.Rotation.X); Result = true; }
        if(Target.Rotation.Y !== null) { Current.Rotation.Y = Lerp(Initial.Rotation.Y, t, Target.Rotation.Y); Result = true; }
        if(Target.Rotation.Z !== null) { Current.Rotation.Z = Lerp(Initial.Rotation.Z, t, Target.Rotation.Z); Result = true; }

        if(Target.Opacity !== null) { Current.Opacity = Lerp(Initial.Opacity, t, Target.Opacity); Result = true; }

        if(Target.ScrollX !== null) { Current.ScrollX = Lerp(Initial.ScrollX, t, Target.ScrollX); Result = true; }

        if(Target.ZIndex !== null) { Current.ZIndex = Lerp(Initial.ZIndex, t, Target.ZIndex); Result = true; }
    }
    return Result;
}

function
ShiftStage()
{
    if(Nav.Transition.StageDurations.length) { Nav.Transition.StageDurations.shift(); }
    if(Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.length) { Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.shift(); }
    if(Nav.Transition.Transforms.ButtonsContainer.TargetStages.length) { Nav.Transition.Transforms.ButtonsContainer.TargetStages.shift(); }
    if(Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.length) { Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.shift(); }
    if(Nav.Transition.Transforms.RelevantButton.TargetStages.length) { Nav.Transition.Transforms.RelevantButton.TargetStages.shift(); }
}

function
MergeTransform(Dest, Src)
{
    if(Src.Pos.X !== null) { Dest.Pos.X = Src.Pos.X; }
    if(Src.Pos.Y !== null) { Dest.Pos.Y = Src.Pos.Y; }

    if(Src.Scale.X !== null) { Dest.Scale.X = Src.Scale.X; }
    if(Src.Scale.Y !== null) { Dest.Scale.Y = Src.Scale.Y; }

    if(Src.Rotation.X !== null) { Dest.Rotation.X = Src.Rotation.X; }
    if(Src.Rotation.Y !== null) { Dest.Rotation.Y = Src.Rotation.Y; }
    if(Src.Rotation.Z !== null) { Dest.Rotation.Z = Src.Rotation.Z; }

    if(Src.Opacity !== null) { Dest.Opacity = Src.Opacity; }

    if(Src.ScrollX !== null) { Dest.ScrollX = Src.ScrollX; }

    if(Src.ZIndex !== null) { Dest.ZIndex = Src.ZIndex; }
}

function
DoTransitionStage(Now)
{
    if(Nav.Transition.StageDurations.length)
    {
        if(Nav.Transition.StartTime === undefined)
        {
            Nav.Transition.StartTime = Now;
        }

        var Elapsed = Now - Nav.Transition.StartTime;
        var Duration = Nav.Transition.StageDurations[0];
        if(Duration === 0)
        {
            // Instant transform
            if(Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.length)
            {
                MergeTransform(Nav.Transition.Transforms.ButtonsTransitionContainer.Current, Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages[0]);
                ApplyTransform(Nav.Transition.ButtonsTransitionContainerElement, Nav.Transition.Transforms.ButtonsTransitionContainer.Current);
            }
            if(Nav.Transition.Transforms.ButtonsContainer.TargetStages.length)
            {
                MergeTransform(Nav.Transition.Transforms.ButtonsContainer.Current, Nav.Transition.Transforms.ButtonsContainer.TargetStages[0]);
                ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
            }
            if(Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.length)
            {
                MergeTransform(Nav.Transition.Transforms.ButtonsContainerClone.Current, Nav.Transition.Transforms.ButtonsContainerClone.TargetStages[0]);
                ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
            }
            if(Nav.Transition.Transforms.RelevantButton.TargetStages.length)
            {
                MergeTransform(Nav.Transition.Transforms.RelevantButton.Current, Nav.Transition.Transforms.RelevantButton.TargetStages[0]);
                ApplyTransform(Nav.Transition.RelevantButtonElement, Nav.Transition.Transforms.RelevantButton.Current);
            }
        }
        else
        {
            // Lerp
            var t = Clamp01(Elapsed / Duration);
            if(LerpTransforms(Nav.Transition.Transforms.ButtonsTransitionContainer, t))
            {
                ApplyTransform(Nav.Transition.ButtonsTransitionContainerElement, Nav.Transition.Transforms.ButtonsTransitionContainer.Current);
            }
            if(LerpTransforms(Nav.Transition.Transforms.ButtonsContainer, t))
            {
                ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
            }
            if(LerpTransforms(Nav.Transition.Transforms.ButtonsContainerClone, t))
            {
                ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
            }
            if(LerpTransforms(Nav.Transition.Transforms.RelevantButton, t))
            {
                ApplyTransform(Nav.Transition.RelevantButtonElement, Nav.Transition.Transforms.RelevantButton.Current);
            }
        }
        if(TransformsComplete(Nav.Transition.Transforms))
        {
            FinaliseTransforms(Nav.Transition.Transforms);
        }
        Nav.Transition.RequestedFrame = window.requestAnimationFrame(DoTransitionStage);
    }
    else
    {
        Nav.Transition.RequestedFrame = undefined;
        ResetButtonsContainerClone();
        DequeueInteraction();
    }
}

function
CompressTransitionStages()
{
    while(Nav.Transition.StageDurations.length > 1)
    {
        Nav.Transition.StageDurations.shift()
    }
    Nav.Transition.StageDurations[0] = 0;
    
    while(Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.length > 1)
    {
        Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.shift();
    }

    while(Nav.Transition.Transforms.ButtonsContainer.TargetStages.length > 1)
    {
        Nav.Transition.Transforms.ButtonsContainer.TargetStages.shift();
    }

    while(Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.length > 1)
    {
        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.shift();
    }

    while(Nav.Transition.Transforms.RelevantButton.TargetStages.length > 1)
    {
        Nav.Transition.Transforms.RelevantButton.TargetStages.shift();
    }
}

function
DoTransition()
{
    if(Nav.Transition.Enabled == false)
    {
        CompressTransitionStages();
    }

    CopyTransform(Nav.Transition.Transforms.ButtonsTransitionContainer.Initial, Nav.Transition.Transforms.ButtonsTransitionContainer.Current);
    CopyTransform(Nav.Transition.Transforms.ButtonsContainer.Initial, Nav.Transition.Transforms.ButtonsContainer.Current);
    CopyTransform(Nav.Transition.Transforms.ButtonsContainerClone.Initial, Nav.Transition.Transforms.ButtonsContainerClone.Current);
    CopyTransform(Nav.Transition.Transforms.RelevantButton.Initial, Nav.Transition.Transforms.RelevantButton.Current);

    Nav.Transition.StartTime = undefined;
    Nav.Transition.RequestedFrame = window.requestAnimationFrame(DoTransitionStage);
}

function
NodesMatch(A, B)
{
    var Result = false;
    var i = 0;
    if(A && B)
    {
        Result = true;
        for(; i < A.length && i < B.length && A[i] == B[i];)
        {
            ++i;
        }
        if(i != A.length || i != B.length)
        {
            Result = false;
        }
    }
    else if(!A && !B)
    {
        Result = true;
    }
    return Result;
}

function
ButtonAndLevelMatch(Button, Level)
{
    var Result = true;
    if(Button && Level)
    {
        var ButtonProjects = Button.Projects;
        var ButtonEntries = Button.Entries;
        if(Button.Projects && Button.Projects.length === undefined)
        {
            ButtonProjects = Button.Projects.querySelectorAll(":scope > .cineraIndexProject");
            ButtonEntries = Button.Projects.querySelectorAll(":scope > .cineraIndexEntries > div");
            if(ButtonProjects.length == 0)
            {
                ButtonProjects = null;
            }
            if(ButtonEntries.length == 0)
            {
                ButtonEntries = null;
            }
        }

        if(!NodesMatch(Level.Projects, ButtonProjects))
        {
            Result = false;
        }

        if(!NodesMatch(Level.Entries, ButtonEntries))
        {
            Result = false;
        }

        if(Button.HeadIndex != Level.HeadIndex)
        {
            Result = false;
        }
        if(Button.TailIndex != Level.TailIndex)
        {
            Result = false;
        }
    }
    return Result;
}

function
NullTarget()
{
    let Result = {
        Pos: { X: null, Y: null, }, Scale: { X: null, Y: null, }, Rotation: { X: null, Y: null, Z: null, },
        Opacity: null, ScrollX: null, ZIndex: null,
    };
    return Result;
}

function
ComputeButtonGeometryRelativeToGrid(Button)
{
    var Result = {
        Pos: {
            X: null,
            Y: null,
        },
        Scale: {
            X: null,
            Y: null,
        },
    };

    var ButtonStyle = window.getComputedStyle(Button);

    var GridDimX = Nav.GridDim.X;
    var GridDimY = Nav.GridDim.Y;

    var ButtonDimX = parseInt(ButtonStyle.width);
    var ButtonDimY = parseInt(ButtonStyle.height);

    Result.Scale.X = ButtonDimX / GridDimX;
    Result.Scale.Y = ButtonDimY / GridDimY;

    var ButtonPosX = Button.offsetLeft;
    var ButtonPosY = Button.offsetTop;

    if(!Nav.SortChronological)
    {
        ButtonPosX = GridDimX - ButtonPosX - ButtonDimX;
        ButtonPosY = GridDimY - ButtonPosY - ButtonDimY;
    }

    var ButtonCentreX = ButtonDimX / 2 + ButtonPosX;
    var ButtonCentreY = ButtonDimY / 2 + ButtonPosY;

    var GridCentreX = GridDimX / 2;
    var GridCentreY = GridDimY / 2;

    Result.Pos.X = ButtonCentreX - GridCentreX;
    Result.Pos.Y = ButtonCentreY - GridCentreY;

    return Result;
}

function
GetItemType(Level)
{
    var Result = null;
    if(Level.Projects && Level.Projects.length !== undefined && Level.Projects.length > 0)
    {
        Result = item_type.PROJECT;
    }
    else if(Level.Entries && Level.Entries.length !== undefined && Level.Entries.length > 0)
    {
        Result = item_type.ENTRY;
    }
    return Result;
}

function
GetTraversalLevelBundle()
{
    var Result = {
        Generation: null,
        This: null,
        Parent: null,
        Type: null
    };
    Result.Generation = Nav.TraversalStack.length;
    Result.This = Nav.TraversalStack[Result.Generation - 1];
    Result.Parent = Nav.TraversalStack[Result.Generation - 2];
    Result.Type = GetItemType(Result.This);
    return Result;
}

function
FitText(Element, ItemEnd)
{
    var Paragraph = Element.firstElementChild;
    var ParagraphStyle = window.getComputedStyle(Paragraph);
    var ElementStyle = window.getComputedStyle(Element);
    var Width = parseInt(ElementStyle.width);
    var Height = parseInt(ElementStyle.height);

    Element.style.alignItems = "flex-start"; // NOTE(matt): Allows IsOverflowed() to work on a flex-end Element
    var FontSize = parseInt(window.getComputedStyle(Element).fontSize);
    while(FontSize >= 10.2 && (IsOverflowed(Element) || parseInt(ParagraphStyle.width) > Width || parseInt(ParagraphStyle.height) > Height))
    {
        FontSize -= 0.2;
        Element.style.fontSize = FontSize + "px";
    }

    if(IsOverflowed(Element) || parseInt(ParagraphStyle.width) > Width || parseInt(ParagraphStyle.height) > Height)
    {
        Element.style.fontWeight = "normal";
    }

    var IsHeadOrTailAndTooTallForElement = ItemEnd !== undefined && (Element.scrollHeight > Element.clientHeight || parseInt(ParagraphStyle.height) > Height);
    // NOTE(matt):  Leave "flex-start" in place for tall items, to keep their beginning visible
    if(!IsHeadOrTailAndTooTallForElement)
    {
        Element.style.alignItems = null;
    }
}

function
AppendItemToButton(Button, Text, ItemEnd)
{
    var ButtonElementStyle = window.getComputedStyle(Button.Element);
    var VerticalBorderAllowance = parseInt(ButtonElementStyle.borderLeftWidth) + parseInt(ButtonElementStyle.borderRightWidth);
    var HorizontalBorderAllowance;
    var ItemElement = document.createElement("div");
    ItemElement.classList.add("cineraText");
    switch(ItemEnd)
    {
        case item_end.HEAD:
            {
                HorizonalBorderAllowance = parseInt(ButtonElementStyle.borderTopWidth);
                ItemElement.classList.add("head-item");
            } break;
        case item_end.TAIL:
            {
                HorizonalBorderAllowance = parseInt(ButtonElementStyle.borderBottomWidth);
                ItemElement.classList.add("tail-item");
            } break;
    }

    if(!Nav.SortChronological)
    {
        ItemElement.style.transform = "rotate3d(0, 0, 1, 180deg)";
    }

    var ParagraphNode = document.createElement("p");
    ParagraphNode.textContent = Text;
    ItemElement.appendChild(ParagraphNode);
    var Item = Button.Element.appendChild(ItemElement);

    // NOTE(matt):  This enables Safari to apply height 50% to the head / tail items
    var ButtonWidth = parseInt(ButtonElementStyle.width);
    var ButtonHeight = parseInt(ButtonElementStyle.height);
    SetDim(Button.Element, ButtonWidth + "px", ButtonHeight + "px");
    ////

    FitText(Item, ItemEnd);
}

function
UpdateButtons(TransitionType, RelevantButton, PoppedLevel)
{
    if(GridSizeIsSupported(Nav.GridSize))
    {
        var LevelBundle = GetTraversalLevelBundle();

        Nav.Controls.GridTraversal.Prev.children[0].textContent = "←";
        Nav.Controls.GridTraversal.PrevAscends = false;
        Nav.Controls.GridTraversal.NextAscends = false;
        if(LevelBundle.Generation <= 1)
        {
            Nav.Controls.GridTraversal.Ascend.classList.add("nowhere");
            Nav.Controls.GridTraversal.Prev.classList.add("nowhere");
            Nav.Controls.GridTraversal.Next.classList.add("nowhere");
            Nav.Controls.GridTraversal.Next.classList.remove("ascension");
        }
        else
        {
            Nav.Controls.GridTraversal.Ascend.classList.remove("nowhere");
            Nav.Controls.GridTraversal.Prev.classList.remove("nowhere");
            Nav.Controls.GridTraversal.Next.classList.remove("nowhere");

            if(!HasPrevSibling(LevelBundle.This))
            {
                Nav.Controls.GridTraversal.Prev.classList.add("nowhere");
            }
            else if(SiblingIsLeaf(siblings.PREV))
            {
                Nav.Controls.GridTraversal.PrevAscends = true;
                Nav.Controls.GridTraversal.Prev.children[0].textContent = Nav.SortChronological ? "↰" : "↲";
            }

            if(!HasNextSibling(LevelBundle.This))
            {
                Nav.Controls.GridTraversal.Next.classList.add("nowhere");
                Nav.Controls.GridTraversal.Next.classList.remove("ascension");
            }
            else if(SiblingIsLeaf(siblings.NEXT))
            {
                Nav.Controls.GridTraversal.NextAscends = true;
                Nav.Controls.GridTraversal.Next.classList.add("ascension");
            }
            else
            {
                Nav.Controls.GridTraversal.Next.classList.remove("ascension");
            }
        }

        var Distribution = ComputeItemDistribution(LevelBundle.This);

        // NOTE(matt):  Centre-alignment. If people would prefer left-alignment, we do that here
        //
        //              We're doing simple 1D centring here, so would need to do correct 2D centring
        var HalfEmptyButtonCount = (Nav.Buttons.length - (Distribution.ProjectsToPlace + Distribution.EntriesToPlace)) / 2;
        var EmptyPadding = 0;
        //EmptyPadding = Math.floor(HalfEmptyButtonCount); // NOTE(matt): Comment out to disable centring
        //

        var Prev = null;
        var ButtonInfo = { HeadIndex: null, TailIndex: null, ItemCount: null, Theme: null, };
        var DoingEntries = false;

        if(TransitionType !== undefined)
        {
            CloneButtonsContainer();
        }

        for(var ButtonIndex = 0; ButtonIndex < Nav.Buttons.length; ++ButtonIndex)
        {
            let This = Nav.Buttons[ButtonIndex];
            EmptyAndResetButton(This);
            if(EmptyPadding > 0)
            {
                --EmptyPadding;
            }
            else
            {
                if(Distribution.ProjectsToPlace > 0 || Distribution.EntriesToPlace > 0)
                {
                    if(Distribution.ProjectsToPlace > 0)
                    {
                        This.Projects = LevelBundle.This.Projects;
                        if(Distribution.ProjectsToPlace == 1 || Distribution.ProjectsToPlace == Distribution.ButtonsForProjects - ButtonIndex)
                        {
                            Distribution.FullButtonProjectCount = 1;
                        }

                        ButtonInfo = SetButtonInfo(This, Prev, LevelBundle.This, Distribution);
                        if(ButtonInfo.ItemCount == 1)
                        {
                            This.Projects = LevelBundle.This.Projects[ButtonInfo.HeadIndex];
                        }
                        Distribution.ProjectsToPlace -= ButtonInfo.ItemCount;

                        if(Distribution.FullButtonProjectCount == 1)
                        {
                            This.Element.classList.add("leaf");
                            var TextElement = document.createElement("p");
                            TextElement.classList.add("cineraText");
                            if(!Nav.SortChronological)
                            {
                                TextElement.style.transform = "rotate3d(0, 0, 1, 180deg)";
                            }
                            var Text = LevelBundle.This.Projects[ButtonInfo.HeadIndex].querySelector(".cineraProjectTitle").innerText;
                            var TextNode = document.createTextNode(Text);
                            TextElement.appendChild(TextNode);
                            This.Element.appendChild(TextElement);
                            FitText(This.Element);
                        }
                        else
                        {
                            var HeadText = LevelBundle.This.Projects[ButtonInfo.HeadIndex].querySelector(".cineraProjectTitle").innerText;
                            AppendItemToButton(This, HeadText, item_end.HEAD);

                            var TailText = LevelBundle.This.Projects[ButtonInfo.TailIndex].querySelector(".cineraProjectTitle").innerText;
                            AppendItemToButton(This, TailText, item_end.TAIL);
                        }
                    }
                    else
                    {
                        This.Entries = LevelBundle.This.Entries;
                        if(!DoingEntries)
                        {
                            Prev = null;
                            DoingEntries = true;
                        }

                        if(Distribution.EntriesToPlace == 1 || Distribution.EntriesToPlace == Distribution.ButtonsForEntries - ButtonIndex)
                        {
                            Distribution.FullButtonEntryCount = 1;
                        }

                        ButtonInfo = SetButtonInfo(This, Prev, LevelBundle.This, Distribution);
                        if(ButtonInfo.ItemCount == 1)
                        {
                            This.Entries = This.Entries[ButtonInfo.HeadIndex];
                        }
                        Distribution.EntriesToPlace -= ButtonInfo.ItemCount;

                        if(Distribution.FullButtonEntryCount == 1)
                        {
                            This.Element.classList.add("leaf");
                            var ButtonLink = document.createElement("a");
                            ButtonLink.classList.add("cineraText");
                            if(!Nav.SortChronological)
                            {
                                ButtonLink.style.transform = "rotate3d(0, 0, 1, 180deg)";
                            }
                            var EntryAddress = LevelBundle.This.Entries[ButtonInfo.HeadIndex].lastElementChild.getAttribute("href");
                            ButtonLink.setAttribute("href", EntryAddress);
                            var Text = LevelBundle.This.Entries[ButtonInfo.HeadIndex].innerText;
                            var TextNode = document.createTextNode(Text);
                            ButtonLink.appendChild(TextNode);

                            This.Element.appendChild(ButtonLink);
                            FitText(This.Element);
                        }
                        else
                        {
                            var HeadText = LevelBundle.This.Entries[ButtonInfo.HeadIndex].innerText;
                            AppendItemToButton(This, HeadText, item_end.HEAD);

                            var TailText = LevelBundle.This.Entries[ButtonInfo.TailIndex].innerText;
                            AppendItemToButton(This, TailText, item_end.TAIL);
                        }
                    }

                    This.Element.classList.add(ButtonInfo.Theme);
                    Prev = ButtonInfo;
                }
                else
                {
                    This.Element.classList.add(Nav.Nexus.classList[0]);
                }
            }
            if(PoppedLevel && !Nav.Transition.RelevantButtonElement && ButtonAndLevelMatch(This, PoppedLevel))
            {
                Nav.Transition.RelevantButtonElement = This.Element;
            }
        }
        if(TransitionType !== undefined)
        {
            switch(TransitionType)
            {
                case transition_type.SIBLING_SHIFT_PREV:
                    {
                        // Init targets
                        //// ButtonsTransitionContainer
                        let TargetA0 = NullTarget();
                        var Padding = Nav.GridColumnGap;
                        if(Nav.SortChronological)
                        {
                            TargetA0.ScrollX = 0;
                        }
                        else
                        {
                            TargetA0.ScrollX = Nav.GridDim.X + Padding;
                        }

                        Nav.Transition.StageDurations.push(320);
                        Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.push(TargetA0);

                        // Prep
                        Nav.Transition.ButtonsContainerCloneElement.style.position = "relative";

                        var ScrollX;
                        if(Nav.SortChronological)
                        {
                            Nav.ButtonsContainer.style.order = 0;
                            Nav.Transition.ButtonsContainerCloneElement.style.order = 1;
                            ScrollX = Nav.GridDim.X + Padding;
                        }
                        else
                        {
                            Nav.ButtonsContainer.style.order = 1;
                            Nav.Transition.ButtonsContainerCloneElement.style.order = 0;
                            ScrollX = 0;
                        }

                        Nav.Transition.ButtonsContainerCloneElement.style.paddingLeft = Padding + "px";

                        Nav.Transition.Transforms.ButtonsTransitionContainer.Current.ScrollX = ScrollX;
                        ApplyTransform(Nav.Transition.ButtonsTransitionContainerElement, Nav.Transition.Transforms.ButtonsTransitionContainer.Current);
                    } break;
                case transition_type.SIBLING_SHIFT_NEXT:
                    {
                        // Init targets
                        ////
                        let TargetA0 = NullTarget();
                        var Padding = Nav.GridColumnGap;
                        if(Nav.SortChronological)
                        {
                            TargetA0.ScrollX = Nav.GridDim.X + Padding;
                        }
                        else
                        {
                            TargetA0.ScrollX = 0;
                        }

                        Nav.Transition.StageDurations.push(320);
                        Nav.Transition.Transforms.ButtonsTransitionContainer.TargetStages.push(TargetA0);

                        // Prep
                        Nav.Transition.ButtonsContainerCloneElement.style.position = "relative";

                        var ScrollX;

                        if(Nav.SortChronological)
                        {
                            Nav.ButtonsContainer.style.order = 1;
                            Nav.Transition.ButtonsContainerCloneElement.style.order = 0;
                            ScrollX = 0;
                        }
                        else
                        {
                            Nav.ButtonsContainer.style.order = 0;
                            Nav.Transition.ButtonsContainerCloneElement.style.order = 1;
                            ScrollX = Nav.GridDim.X + Padding;
                        }

                        Nav.Transition.ButtonsContainerCloneElement.style.paddingRight = Padding + "px";

                        Nav.Transition.Transforms.ButtonsTransitionContainer.Current.ScrollX = ScrollX;
                        ApplyTransform(Nav.Transition.ButtonsTransitionContainerElement, Nav.Transition.Transforms.ButtonsTransitionContainer.Current);
                    } break;
                case transition_type.PROJECT_ENTRY:
                    {
                        // Init targets
                        //// ButtonsContainer
                        let TargetA0 = NullTarget();
                        let TargetA1 = NullTarget();
                        let TargetA2 = NullTarget();
                        let TargetA3 = NullTarget();

                        if(Nav.SortChronological)
                        {
                            TargetA0.Rotation.Y = 90;
                        }
                        else
                        {
                            TargetA0.Rotation.Y = -90;
                        }
                        TargetA1.ZIndex = 1;
                        TargetA2.Rotation.Y = 0;
                        TargetA3.Pos.X = 0;
                        TargetA3.Pos.Y = 0;
                        TargetA3.Scale.X = 1;
                        TargetA3.Scale.Y = 1;

                        //// RelevantButton
                        let TargetB0 = NullTarget();
                        let TargetB1 = NullTarget();
                        let TargetB2 = NullTarget();

                        if(Nav.SortChronological)
                        {
                            TargetB0.Rotation.Y = -90;
                            TargetB2.Rotation.Y = -180;
                        }
                        else
                        {
                            TargetB0.Rotation.Y = 90;
                            TargetB2.Rotation.Y = 180;
                        }

                        //// ButtonsContainerClone
                        let TargetC0 = NullTarget();
                        let TargetC1 = NullTarget();

                        TargetC1.ZIndex = 0;


                        Nav.Transition.StageDurations.push(80);
                        Nav.Transition.StageDurations.push(0);
                        Nav.Transition.StageDurations.push(80);
                        Nav.Transition.StageDurations.push(160);

                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA0);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA1);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA2);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA3);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB0);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB1);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB2);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC0);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC1);

                        // Prep
                        var RelevantButtonIndex = GetIndexOfButton(RelevantButton);
                        Nav.Transition.RelevantButtonElement = Nav.Transition.ButtonsContainerCloneElement.children[RelevantButtonIndex];

                        var ButtonGeometry = ComputeButtonGeometryRelativeToGrid(Nav.Transition.RelevantButtonElement);

                        Nav.Transition.Transforms.ButtonsContainer.Current.Pos.X = ButtonGeometry.Pos.X;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Pos.Y = ButtonGeometry.Pos.Y;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Scale.X = ButtonGeometry.Scale.X;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Scale.Y = ButtonGeometry.Scale.Y;
                        if(Nav.SortChronological)
                        {
                            Nav.Transition.Transforms.ButtonsContainer.Current.Rotation.Y = 180;
                        }
                        else
                        {
                            Nav.Transition.Transforms.ButtonsContainer.Current.Rotation.Y = -180;
                        }

                        Nav.Transition.Transforms.ButtonsContainer.Current.ZIndex = 0;

                        Nav.Transition.Transforms.ButtonsContainerClone.Current.ZIndex = 1;

                        ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
                        ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
                    } break;
                case transition_type.PROJECT_EXIT:
                    {
                        // Init targets
                        //// ButtonsContainer
                        let TargetA0 = NullTarget();
                        let TargetA1 = NullTarget();
                        let TargetA2 = NullTarget();
                        TargetA2.ZIndex = 1;

                        //// RelevantButton
                        let TargetB0 = NullTarget();
                        let TargetB1 = NullTarget();
                        let TargetB2 = NullTarget();
                        let TargetB3 = NullTarget();

                        if(Nav.SortChronological)
                        {
                            TargetB1.Rotation.Y = -90;
                        }
                        else
                        {
                            TargetB1.Rotation.Y = 90;
                        }
                        TargetB3.Rotation.Y = 0;

                        //// ButtonsContainerClone
                        let TargetC0 = NullTarget();
                        let TargetC1 = NullTarget();
                        let TargetC2 = NullTarget();
                        let TargetC3 = NullTarget();

                        var ButtonGeometry = ComputeButtonGeometryRelativeToGrid(Nav.Transition.RelevantButtonElement);
                        TargetC0.Pos.X = ButtonGeometry.Pos.X;
                        TargetC0.Pos.Y = ButtonGeometry.Pos.Y;
                        TargetC0.Scale.X = ButtonGeometry.Scale.X;
                        TargetC0.Scale.Y = ButtonGeometry.Scale.Y;
                        if(Nav.SortChronological)
                        {
                            TargetC1.Rotation.Y = 90;
                            TargetC3.Rotation.Y = 180;
                        }
                        else
                        {
                            TargetC1.Rotation.Y = -90;
                            TargetC3.Rotation.Y = -180;
                        }
                        TargetC2.ZIndex = 0;


                        Nav.Transition.StageDurations.push(160);
                        Nav.Transition.StageDurations.push(80);
                        Nav.Transition.StageDurations.push(0);
                        Nav.Transition.StageDurations.push(80);

                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA0);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA1);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA2);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB0);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB1);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB2);
                        Nav.Transition.Transforms.RelevantButton.TargetStages.push(TargetB3);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC0);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC1);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC2);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC3);

                        // Prep
                        if(Nav.SortChronological)
                        {
                            Nav.Transition.Transforms.RelevantButton.Current.Rotation.Y = -180;
                        }
                        else
                        {
                            Nav.Transition.Transforms.RelevantButton.Current.Rotation.Y = 180;
                        }
                        ApplyTransform(Nav.Transition.RelevantButtonElement, Nav.Transition.Transforms.RelevantButton.Current);

                        Nav.Transition.Transforms.ButtonsContainer.Current.ZIndex = 0;
                        ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);

                        Nav.Transition.Transforms.ButtonsContainerClone.Current.ZIndex = 1;
                        ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
                    } break;
                case transition_type.SUBDIVISION_DESCENT:
                    {
                        // Init targets
                        //// ButtonsContainer
                        let TargetA0 = NullTarget();
                        let TargetA1 = NullTarget();

                        TargetA0.Opacity = 1;
                        TargetA1.Pos.X = 0;
                        TargetA1.Pos.Y = 0;
                        TargetA1.Scale.X = 1;
                        TargetA1.Scale.Y = 1;

                        Nav.Transition.StageDurations.push(160);
                        Nav.Transition.StageDurations.push(160);

                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA0);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA1);

                        // Prep
                        var RelevantButtonIndex = GetIndexOfButton(RelevantButton);
                        Nav.Transition.RelevantButtonElement = Nav.Transition.ButtonsContainerCloneElement.children[RelevantButtonIndex];

                        var ButtonGeometry = ComputeButtonGeometryRelativeToGrid(Nav.Transition.RelevantButtonElement);

                        Nav.Transition.Transforms.ButtonsContainer.Current.Pos.X = ButtonGeometry.Pos.X;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Pos.Y = ButtonGeometry.Pos.Y;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Scale.X = ButtonGeometry.Scale.X;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Scale.Y = ButtonGeometry.Scale.Y;
                        Nav.Transition.Transforms.ButtonsContainer.Current.Opacity = 0;
                        Nav.Transition.Transforms.ButtonsContainer.Current.ZIndex = 1;

                        Nav.Transition.Transforms.ButtonsContainerClone.Current.ZIndex = 0;

                        ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
                        ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
                    } break;
                case transition_type.SUBDIVISION_ASCENT:
                    {
                        // Init targets
                        //// ButtonsContainer
                        let TargetA0 = NullTarget();
                        let TargetA1 = NullTarget();
                        let TargetA2 = NullTarget();
                        TargetA2.ZIndex = 1;

                        //// ButtonsContainerClone
                        let TargetC0 = NullTarget();
                        let TargetC1 = NullTarget();
                        let TargetC2 = NullTarget();

                        var ButtonGeometry = ComputeButtonGeometryRelativeToGrid(Nav.Transition.RelevantButtonElement);
                        TargetC0.Pos.X = ButtonGeometry.Pos.X;
                        TargetC0.Pos.Y = ButtonGeometry.Pos.Y;
                        TargetC0.Scale.X = ButtonGeometry.Scale.X;
                        TargetC0.Scale.Y = ButtonGeometry.Scale.Y;
                        TargetC1.Opacity = 0;
                        TargetC2.ZIndex = 0;


                        Nav.Transition.StageDurations.push(160);
                        Nav.Transition.StageDurations.push(160);
                        Nav.Transition.StageDurations.push(0);

                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA0);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA1);
                        Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(TargetA2);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC0);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC1);
                        Nav.Transition.Transforms.ButtonsContainerClone.TargetStages.push(TargetC2);

                        // Prep
                        Nav.Transition.Transforms.ButtonsContainer.Current.ZIndex = 0;
                        Nav.Transition.Transforms.ButtonsContainerClone.Current.ZIndex = 1;
                        ApplyTransform(Nav.Transition.ButtonsContainerCloneElement, Nav.Transition.Transforms.ButtonsContainerClone.Current);
                        ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
                    } break;
            }
            DoTransition();
        }
    }
}

function
PushButton(ButtonElement, Button)
{
    var Level = {
        Projects: Button.Projects,
        Entries: Button.Entries,
        HeadIndex: Button.HeadIndex,
        TailIndex: Button.TailIndex,
    };

    var TransitionType = undefined;
    if(Level.Projects !== null || Level.Entries !== null)
    {
        if(Level.Projects !== null)
        {
            if(Level.Projects.length === undefined)
            {
                var Entries = Level.Projects.querySelectorAll(":scope > .cineraIndexEntries > div");
                var Projects = Level.Projects.querySelectorAll(":scope > .cineraIndexProject");
                Level.Entries = Entries.length ? Entries : null;
                Level.Projects = Projects.length ? Projects : null;
                TransitionType = transition_type.PROJECT_ENTRY;
            }
            else
            {
                TransitionType = transition_type.SUBDIVISION_DESCENT;
            }
            Nav.TraversalStack.push(Level);
            UpdateButtons(TransitionType, Button);
        }
        else
        {
            if(Level.Entries.length === undefined)
            {
                var Address = ButtonElement.lastElementChild.getAttribute("href");
                location = Address;
            }
            else
            {
                Nav.TraversalStack.push(Level);
                TransitionType = transition_type.SUBDIVISION_DESCENT;
                UpdateButtons(TransitionType, Button);
            }
        }
    }
}

function
RangeContains(Range, Target)
{
    return (Range.HeadIndex == null && Range.TailIndex == null) || (Range.HeadIndex <= Target && Range.TailIndex >= Target);
}

function
LengthOf(Level)
{
    var Result = 0;
    var Items = Level.Projects && Level.Projects.length > 0 ? Level.Projects : Level.Entries;
    if(Items)
    {
        if(Level.HeadIndex !== null && Level.TailIndex !== null)
        {
            Result = Diff(Level.HeadIndex, Level.TailIndex) + 1;
        }
        else if(Items.length !== undefined)
        {
            Result = Items.length;
        }
        else
        {
            Result = 1;
        }
    }
    return Result;
}

function
DereferenceLevel(Generation)
{
    var Level = Nav.TraversalStack[Generation - 1];
    var Result = {
        Projects: Level.Projects,
        Entries: Level.Entries,
        HeadIndex: Level.HeadIndex,
        TailIndex: Level.TailIndex,
    };
    return Result;
}

function
GetSubdivisionFor(LevelBundle, Index, TargetGeneration)
{
    var Result = {
        Projects: LevelBundle.This.Projects,
        Entries: LevelBundle.This.Entries,
        HeadIndex: null,
        TailIndex: null,
    };

    var GenerationsToDistribute = 1;
    var Generation = TargetGeneration ? TargetGeneration : LevelBundle.Generation;
    var Parent = DereferenceLevel(Generation - GenerationsToDistribute);
    while(!RangeContains(Parent, Index))
    {
        ++GenerationsToDistribute;
        Parent = DereferenceLevel(Generation - GenerationsToDistribute);
    }

    while(GenerationsToDistribute > 0)
    {
        var Distribution = ComputeItemDistribution(Parent);

        var ToPlace = null;
        var FullButtonItemCount = null;
        var ButtonCount = null;
        if(LevelBundle.Type == item_type.PROJECT)
        {
            ToPlace = Distribution.ProjectsToPlace;
            FullButtonItemCount = Distribution.FullButtonProjectCount;
            ButtonCount = Distribution.ButtonsForProjects;
        }
        else if(LevelBundle.Type = item_type.ENTRY)
        {
            ToPlace = Distribution.EntriesToPlace;
            FullButtonItemCount = Distribution.FullButtonEntryCount;
            ButtonCount = Distribution.ButtonsForEntries;
        }

        Result.HeadIndex = null;
        Result.TailIndex = null;
        for(var i = 0; i < ButtonCount; ++i)
        {
            if(ToPlace == ButtonCount - i) { FullButtonItemCount = 1; }
            Result.HeadIndex = Result.TailIndex !== null ? Result.TailIndex + 1 : Parent.HeadIndex !== null ? Parent.HeadIndex : 0;
            Result.TailIndex = Result.HeadIndex + Math.min(FullButtonItemCount, ToPlace) - 1;
            if(RangeContains(Result, Index)) { break; }
            ToPlace -= LengthOf(Result);
        }
        --GenerationsToDistribute;
        Parent.HeadIndex = Result.HeadIndex;
        Parent.TailIndex = Result.TailIndex;
    }

    return Result;
}

function
SiblingIsLeaf(SiblingID)
{
    var LevelBundle = GetTraversalLevelBundle();
    return LengthOf(GetSubdivisionFor(LevelBundle,
        SiblingID == siblings.PREV ? LevelBundle.This.HeadIndex - 1 : LevelBundle.This.TailIndex + 1)) == 1;
}

function
ShiftToSibling(SiblingID)
{
    var LevelBundle = GetTraversalLevelBundle();

    if((SiblingID == siblings.PREV && HasPrevSibling(LevelBundle.This)) || 
        (SiblingID == siblings.NEXT && HasNextSibling(LevelBundle.This)))
    {
        var TransitionType = SiblingID == siblings.PREV ? transition_type.SIBLING_SHIFT_PREV : transition_type.SIBLING_SHIFT_NEXT;
        var CurrentItem = LevelBundle.Type == item_type.PROJECT ? LevelBundle.This.Projects : LevelBundle.This.Entries;

        var TargetIndex = SiblingID == siblings.PREV ? LevelBundle.This.HeadIndex - 1 : LevelBundle.This.TailIndex + 1;
        LevelBundle.Parent = Nav.TraversalStack[0];
        var TransitionLevel;
        for(let i = 0; i < LevelBundle.Generation; ++i)
        {
            LevelBundle.This = Nav.TraversalStack[i];

            if((LevelBundle.Type == item_type.PROJECT && CurrentItem == LevelBundle.Parent.Projects) ||
                (LevelBundle.Type == item_type.ENTRY && CurrentItem == LevelBundle.Parent.Entries))
            {
                if(!RangeContains(LevelBundle.This, TargetIndex))
                {
                    Nav.TraversalStack[i] = GetSubdivisionFor(LevelBundle, TargetIndex, i + 1);
                    if(LengthOf(Nav.TraversalStack[i]) == 1)
                    {
                        TransitionType = transition_type.SUBDIVISION_ASCENT;
                        TransitionLevel = LevelBundle.This;
                        Nav.TraversalStack.pop();
                    }
                }
            }
            LevelBundle.Parent = Nav.TraversalStack[i];
        }
        UpdateButtons(TransitionType, undefined, TransitionLevel);
    }
    else
    {
        DequeueInteraction();
    }
}

function
Ascend()
{
    var LevelBundle = GetTraversalLevelBundle();
    if(LevelBundle.Generation > 1)
    {
        var TransitionType = LevelBundle.This.HeadIndex !== null && LevelBundle.This.TailIndex !== null ? transition_type.SUBDIVISION_ASCENT : transition_type.PROJECT_EXIT;
        var PoppedLevel = Nav.TraversalStack.pop();
        UpdateButtons(TransitionType, undefined, PoppedLevel);
    }
}

function
ShiftToPrevSibling()
{
    var LevelBundle = GetTraversalLevelBundle();
    if(LevelBundle.Generation > 1)
    {
        if(Nav.Controls.GridTraversal.PrevAscends == true)
        {
            Ascend();
        }
    }
    ShiftToSibling(siblings.PREV);
}

function
ShiftToNextSibling()
{
    ShiftToSibling(siblings.NEXT);
}

function
InputIsFocused()
{
    return document.activeElement == Search.QueryElement;
}

function
ShouldFireGridEvents()
{
    return Nav.ViewType == view_type.GRID && !InputIsFocused() && !IsQuery();
}

function
ModifyControlKeybinding(Event)
{
    // TODO(matt): Settle on the final sets of bindings
    var Chron = Nav.SortChronological;
    var Key = Event.key;
    var IT = interaction_type.PUSH_BUTTON;
    var ID = { Element: null, Button: null, }; // NOTE(matt): InteractionData

    switch(Key)
    {
        case "?": if(!InputIsFocused()) { Nav.Controls.HelpDocumentation.classList.toggle("visible"); } break;
        case "t": if(!InputIsFocused()) { EnqueueInteraction(interaction_type.SORT); } break;
        case "y": if(!InputIsFocused()) { ToggleView(); } break;
        case "m": if(!InputIsFocused()) { ToggleAnimations(); } break;
        case "h": if(ShouldFireGridEvents()) { EnqueueInteraction(Chron ? interaction_type.SIBLING_SHIFT_PREV : interaction_type.SIBLING_SHIFT_NEXT); } break;
        case "k": if(ShouldFireGridEvents()) { EnqueueInteraction(interaction_type.ASCEND); } break;
        case "l": if(ShouldFireGridEvents()) { EnqueueInteraction(Chron ? interaction_type.SIBLING_SHIFT_NEXT : interaction_type.SIBLING_SHIFT_PREV); } break;
    }
}

function
BindControlKeys()
{
    document.addEventListener("keydown", ModifyControlKeybinding);
}

function
UnbindControlKeys()
{
    document.removeEventListener("keydown", ModifyControlKeybinding);
}

function
RebindControlKeys()
{
    UnbindControlKeys();
    BindControlKeys();
}

function
KeyIsInGrid(GridSize, KeyPos)
{
    return GridSize.X > KeyPos.X && GridSize.Y > KeyPos.Y;
}

function
ComputeNaturalKeyIndex(GridSize, KeyPos)
{
    return KeyPos.Y * GridSize.X + KeyPos.X;
}

function
EnqueueGridInteraction(GridSize, KeyPos)
{
    var Chron = Nav.SortChronological;
    var LastButtonIndex = Nav.Buttons.length - 1;
    var NaturalIndex = ComputeNaturalKeyIndex(GridSize, KeyPos);
    var IT = interaction_type.PUSH_BUTTON;
    var ID = { Element: null, Button: null, }; // NOTE(matt): InteractionData
    ID.Element = Nav.Buttons[Chron ? NaturalIndex : LastButtonIndex - NaturalIndex].Element;
    ID.Button = Nav.Buttons[Chron ? NaturalIndex : LastButtonIndex - NaturalIndex];
    EnqueueInteraction(IT, ID);
}

function
Get2DPosFromIndex(Layout, Index)
{
    var Result = {
        X: null,
        Y: null,
    };

    Result.X = Index % Layout.X;
    Result.Y = (Index - Result.X) / Layout.Y;

    return Result;
}

function
ModifyGridKeybinding(Event)
{
    var Key = Event.key;
    // TODO(matt):  With this, we could probably easily add a setting for keyboard layout: e.g. Dvorak
    var PhysicalKeys = [
        "1", "2", "3", "4",
        "q", "w", "e", "r",
        "a", "s", "d", "f",
        "z", "x", "c", "v"
    ];

    var KeyLayout = { X: 4, Y: 4 };
    for(var i = 0; i < PhysicalKeys.length; ++i)
    {
        if(Key == PhysicalKeys[i])
        {
            var KeyPos = Get2DPosFromIndex(KeyLayout, i);
            if(KeyIsInGrid(Nav.GridSize, KeyPos) && ShouldFireGridEvents())
            {
                EnqueueGridInteraction(Nav.GridSize, KeyPos);
            }
        }
    }
}

function
BindGridKeys()
{
    document.addEventListener("keydown", ModifyGridKeybinding);
}

function
UnbindGridKeys()
{
    document.removeEventListener("keydown", ModifyGridKeybinding);
}

function
DoRotationStage(Now)
{
    if(Nav.Transition.StageDurations.length)
    {
        if(Nav.Transition.StartTime === undefined)
        {
            Nav.Transition.StartTime = Now;
        }

        var Elapsed = Now - Nav.Transition.StartTime;
        var Duration = Nav.Transition.StageDurations[0];

        if(Duration === 0)
        {
            if(Nav.Transition.Transforms.ButtonsContainer.TargetStages.length)
            {
                MergeTransform(Nav.Transition.Transforms.ButtonsContainer.Current, Nav.Transition.Transforms.ButtonsContainer.TargetStages[0]);
                ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
            }
        }
        else
        {
            var t = Clamp01(Elapsed / Duration);
            if(LerpTransforms(Nav.Transition.Transforms.ButtonsContainer, t))
            {
                ApplyTransform(Nav.ButtonsContainer, Nav.Transition.Transforms.ButtonsContainer.Current);
            }
        }

        for(var i = 0; i < Nav.ButtonsContainer.children.length; ++i)
        {
            var This = Nav.ButtonsContainer.children[i];
            var ThisTexts = This.querySelectorAll(".cineraText");
            for(var j = 0; j < ThisTexts.length; ++j)
            {
                ThisTexts[j].style.transform = "rotate3d(0, 0, 1, " + -Nav.Transition.Transforms.ButtonsContainer.Current.Rotation.Z + "deg)";
            }
        }

        if(TransformsComplete(Nav.Transition.Transforms))
        {
            FinaliseTransforms(Nav.Transition.Transforms);
        }
        Nav.Transition.RequestedFrame = window.requestAnimationFrame(DoRotationStage);
    }
    else
    {
        Nav.Transition.RequestedFrame = undefined;
        ResetButtonsContainerClone();
        DequeueInteraction();
        Nav.Controls.Header.style.overflow = null;
    }
}

function
RotateButtons(Initialising)
{
    // TODO(matt):  Consider pushing this through DoTransition(), aware that it'd need to transform ".cineraText" children
    CopyTransform(Nav.Transition.Transforms.ButtonsContainer.Initial, Nav.Transition.Transforms.ButtonsContainer.Current);
    Nav.Transition.StartTime = undefined;
    if(!Initialising && Nav.Transition.Enabled)
    {
        Nav.Transition.StageDurations.push(320);
    }
    else
    {
        Nav.Transition.StageDurations.push(0);
    }

    let Target = NullTarget();
    if(Nav.SortChronological)
    {
        Target.Rotation.Z = 0;
    }
    else
    {
        Target.Rotation.Z = 180;
    }
    Nav.Transition.Transforms.ButtonsContainer.TargetStages.push(Target);

    CopyTransform(Nav.Transition.Transforms.ButtonsContainer.Initial, Nav.Transition.Transforms.ButtonsContainer.Current);
    Nav.Transition.RequestedFrame = window.requestAnimationFrame(DoRotationStage);
}

function
AddAnimationClass()
{
    Nav.Nexus.classList.add("anim");
}

function
Sort(Initialising)
{
    ResetButtonsContainerClone();

    if(Initialising && Nav.Transition.Enabled) { Nav.Nexus.classList.remove("anim"); }
    if(Nav.SortChronological)
    {
        Nav.Controls.Sort.textContent = "Sort: New to Old ⏷";
        Nav.Nexus.classList.add("reversed");
        for(var i = 0; i < Search.Projects.length; ++i)
        {
            if(Search.Projects[i].entriesContainer)
            {
                Search.Projects[i].entriesContainer.style.flexFlow = "column-reverse";
            }
        }
    }
    else
    {
        Nav.Controls.Sort.textContent = "Sort: Old to New ⏶";
        Nav.Nexus.classList.remove("reversed");
        for(var i = 0; i < Search.Projects.length; ++i)
        {
            if(Search.Projects[i].entriesContainer)
            {
                Search.Projects[i].entriesContainer.style.flexFlow = "column";
            }
        }
    }
    if(Initialising && Nav.Transition.Enabled) { setTimeout(AddAnimationClass, 320); }

    UnbindGridKeys(Nav.GridSize);
    Nav.SortChronological = !Nav.SortChronological;
    if(Nav.Controls.GridTraversal.PrevAscends)
    {
        if(Nav.SortChronological)
        {
            Nav.Controls.GridTraversal.Prev.children[0].textContent = "↰";
        }
        else
        {
            Nav.Controls.GridTraversal.Prev.children[0].textContent = "↲";
        }
    }

    if(MaintainingState())
    {
        if(Nav.SortChronological) { ClearStateBit(state_bit.SORT_REVERSED); }
        else { SetStateBit(state_bit.SORT_REVERSED); }
    }
    RotateButtons(Initialising);
    BindGridKeys();
    runSearch(true);
}

function
DequeueInteraction()
{
    if(Nav.InteractionQueue.length)
    {
        var I = Nav.InteractionQueue.shift();

        switch(I.Type)
        {
            case interaction_type.PUSH_BUTTON: { PushButton(I.Data.Element, I.Data.Button); } break;
            case interaction_type.SIBLING_SHIFT_PREV: { ShiftToPrevSibling(); } break;
            case interaction_type.SIBLING_SHIFT_NEXT: { ShiftToNextSibling(); } break;
            case interaction_type.ASCEND: { Ascend(); } break;
            case interaction_type.SORT: { Sort(); } break;
        }
    }
}

function
EnqueueInteraction(InteractionType, Data)
{
    // TODO(matt):  Maybe see about interpolating out of interrupted transitions?
    //
    //              Interruptability:
    //                  Reversible Pairs:
    //                      SIBLING_SHIFT_PREV                  by  SIBLING_SHIFT_NEXT
    //                      SIBLING_SHIFT_NEXT (when SHIFT)     by  SIBLING_SHIFT_PREV
    //                      SIBLING_SHIFT_NEXT (when ASCEND)    by  PUSH_BUTTON (of the corresponding button)
    //                      PUSH_BUTTON                         by  ASCEND
    //                      ASCEND                              by  PUSH_BUTTON (of the corresponding button)
    //                      SORT                                by  SORT
    //                  
    //                  Mixtures:
    //                      SIBLING_SHIFT_PREV – SORT
    //

    var I = {
        Type: InteractionType,
        Data: Data,
    };

    Nav.InteractionQueue.push(I);

    if(!Nav.Transition.RequestedFrame)
    {
        DequeueInteraction();
    }
}

function
UseOrientation(Orientation)
{
    Nav.GridContainer.classList.remove("Portrait", "Landscape", "Left", "Right");
    switch(Orientation)
    {
        case orientations.PORTRAIT:
            {
                Nav.Controls.GridTraversal.Header.insertBefore(Nav.Controls.GridTraversal.Ascend, Nav.Controls.GridTraversal.Next);
                Nav.GridContainer.classList.add("Portrait");
            } break;

        case orientations.LANDSCAPE_LEFT:
            {
                Nav.Controls.GridTraversal.Header.parentElement.insertBefore(Nav.Controls.GridTraversal.Ascend, Nav.Controls.GridTraversal.Header);
                Nav.GridContainer.classList.add("Landscape", "Left");
            } break;

        case orientations.LANDSCAPE_RIGHT:
            {
                Nav.Controls.GridTraversal.Header.parentElement.insertBefore(Nav.Controls.GridTraversal.Ascend, Nav.Controls.GridTraversal.Header);
                Nav.GridContainer.classList.add("Landscape", "Right");
            } break;
    }
}

function
InitNexus()
{
    Nav.List.classList.add("hidden");
    var ButtonsContainerPrototype = document.createElement("div");
    ButtonsContainerPrototype.setAttribute("id", "cineraIndexGrid");

    var ButtonsPrototype = document.createElement("div");
    ButtonsPrototype.classList.add("cineraButtons");

    var ButtonsClonePrototype = document.createElement("div");
    ButtonsClonePrototype.classList.add("cineraButtons");

    ButtonsContainerPrototype.appendChild(ButtonsClonePrototype);
    ButtonsContainerPrototype.appendChild(ButtonsPrototype);
    Nav.Transition.ButtonsTransitionContainerElement = Nav.GridContainer.appendChild(ButtonsContainerPrototype);
    Nav.Grid = Nav.Transition.ButtonsTransitionContainerElement;

    Nav.Transition.ButtonsContainerCloneElement = Nav.Transition.ButtonsTransitionContainerElement.querySelectorAll(".cineraButtons")[0];
    Nav.ButtonsContainer = Nav.Transition.ButtonsTransitionContainerElement.querySelectorAll(".cineraButtons")[1];
    Nav.GridColumnGap = parseInt(window.getComputedStyle(Nav.ButtonsContainer).gridColumnGap);
    Nav.GridRowGap = parseInt(window.getComputedStyle(Nav.ButtonsContainer).gridRowGap);

    // NOTE(matt):  We ResetButtonsContainerClone() anyway, but without cycling this classList Safari seems to do transitions
    //              based on the wrong size grid

    Nav.GridContainer.classList.add("hidden");
    ResetButtonsContainerClone();

    switch(Nav.ViewType)
    {
        case view_type.LIST: { Nav.List.classList.remove("hidden"); ScrollCondition = false; } break;
        case view_type.GRID: { Nav.Grid.classList.remove("hidden"); ScrollCondition = true; } break;
    }

    Nav.Nexus.classList.add("anim");

    if(CineraProps.IsMobile)
    {
        CineraProps.Orientation = GetRealOrientation(orientations.LANDSCAPE_LEFT, CineraProps.IsMobile);
        UseOrientation(CineraProps.Orientation);
    }
}

function
ComputePossibleCellsInDimension(AvailableSpaceInPixels, GridGap)
{
    var Result = 0;
    var SpaceToFill = AvailableSpaceInPixels;
    if(SpaceToFill >= Nav.MinButtonDim)
    {
        SpaceToFill -= Nav.MinButtonDim;
        ++Result;
    }

    for(; SpaceToFill >= (Nav.MinButtonDim + GridGap); )
    {
        SpaceToFill -= (Nav.MinButtonDim + GridGap);
        ++Result;
    }
    return Result;
}

function
GridSizeMeetsMinimumSupported(GridSize)
{
    return GridSize.X * GridSize.Y >= 2;
}

function
GridSizeIsSupported(GridSize)
{
    return (GridSize.X >= Nav.GridMinCellsPerDimension && GridSize.X <= Nav.GridMaxCellsPerDimension) &&
        (GridSize.Y >= Nav.GridMinCellsPerDimension && GridSize.Y <= Nav.GridMaxCellsPerDimension) &&
        GridSizeMeetsMinimumSupported(GridSize);
}

function
ComputeOptimalGridSize()
{
    var Result = {
        X: null,
        Y: null,
    };

    var WindowDim = GetWindowDim(CineraProps.IsMobile);
    var DimReduction = {
        X: 0,
        Y: Nav.Controls.Header.offsetHeight,
    };

    Nav.Transition.ButtonsTransitionContainerElement.style = null;
    Nav.ButtonsContainer.style = null;
    Nav.Controls.GridTraversal.Container.style = null;
    Nav.Controls.GridTraversal.Ascend.style = null;
    Nav.Controls.GridTraversal.Prev.style = null;
    Nav.Controls.GridTraversal.Next.style = null;

    // TODO(matt):  Maybe structure it such that the grid is always not hidden at this point?
    var GridWasHidden = Nav.GridContainer.classList.contains("hidden");
    if(GridWasHidden)
    {
        Nav.GridContainer.classList.remove("hidden");
    }
    if(CineraProps.IsMobile && (CineraProps.Orientation == orientations.LANDSCAPE_LEFT || CineraProps.Orientation == orientations.LANDSCAPE_RIGHT))
    {
        DimReduction.X += Nav.Controls.GridTraversal.Container.offsetWidth;
    }
    else
    {
        DimReduction.Y += Nav.Controls.GridTraversal.Container.offsetHeight;
    }

    var MaxWidth = MaxWidthOfElement(Nav.Transition.ButtonsTransitionContainerElement, WindowDim) - DimReduction.X;
    var MaxHeight = MaxHeightOfElement(Nav.Transition.ButtonsTransitionContainerElement, WindowDim) - DimReduction.Y;

    if(GridWasHidden)
    {
        Nav.GridContainer.classList.add("hidden");
    }

    var BodyStyle = window.getComputedStyle(document.body);
    if(Nav.Nexus.parentNode == document.body)
    {
        // TODO(matt): Robustify this
        MaxWidth -= parseInt(BodyStyle.marginRight);
        MaxHeight -= parseInt(BodyStyle.marginBottom);
    }

    Result.X = ComputePossibleCellsInDimension(MaxWidth, Nav.GridColumnGap);
    Result.Y = ComputePossibleCellsInDimension(MaxHeight, Nav.GridRowGap);

    if(GridSizeMeetsMinimumSupported(Result))
    {
        Result.X = Clamp(Nav.GridMinCellsPerDimension, Result.X, Nav.GridMaxCellsPerDimension);
        Result.Y = Clamp(Nav.GridMinCellsPerDimension, Result.Y, Nav.GridMaxCellsPerDimension);

        var ButtonDimBasedOnX = Math.floor((MaxWidth - Nav.GridColumnGap * (Result.X - 1)) / Result.X);
        var ButtonDimBasedOnY = Math.floor((MaxHeight - Nav.GridRowGap * (Result.Y - 1)) / Result.Y);

        Nav.ButtonDim = Math.min(ButtonDimBasedOnX, ButtonDimBasedOnY);
        Nav.ButtonDim -= Nav.ButtonDim % 2; // NOTE(matt): Even-length helps CSS keep the head & tail's correct size when rotated 180 degrees

        var GridTemplateColumnsStyle = "repeat(" + Result.X + ", minmax(" + Nav.ButtonDim + "px, " + Nav.ButtonDim + "px))";
        Nav.ButtonsContainer.style.gridTemplateColumns = GridTemplateColumnsStyle;

        var GridTemplateRowsStyle = "repeat(" + Result.Y + ", " + Nav.ButtonDim + "px)";
        Nav.ButtonsContainer.style.gridTemplateRows = GridTemplateRowsStyle;

        Nav.GridDim.X = Nav.ButtonDim * Result.X + Nav.GridColumnGap * (Result.X - 1);
        Nav.GridDim.Y = Nav.ButtonDim * Result.Y + Nav.GridRowGap * (Result.Y - 1);

        SetDim(Nav.Transition.ButtonsTransitionContainerElement, Nav.GridDim.X + "px", Nav.GridDim.Y + "px");

        Nav.Controls.GridTraversal.Container.style.maxWidth = Nav.GridDim.X + "px";
        Nav.Controls.GridTraversal.Container.style.maxHeight = Nav.GridDim.Y + "px";

        var TraversalButtonCount = 3;
        if(Nav.Controls.GridTraversal.Container.scrollWidth > Nav.Controls.GridTraversal.Container.clientWidth)
        {
            var TraversalButtonDim = Nav.Controls.GridTraversal.Container.clientWidth / TraversalButtonCount;
            SetDim(Nav.Controls.GridTraversal.Ascend, TraversalButtonDim + "px", TraversalButtonDim + "px");
            SetDim(Nav.Controls.GridTraversal.Prev, TraversalButtonDim + "px", TraversalButtonDim + "px");
            SetDim(Nav.Controls.GridTraversal.Next, TraversalButtonDim + "px", TraversalButtonDim + "px");
        }
        if(Nav.Controls.GridTraversal.Container.scrollHeight > Nav.Controls.GridTraversal.Container.clientHeight)
        {
            var TraversalButtonDim = Nav.Controls.GridTraversal.Container.clientHeight / TraversalButtonCount;
            SetDim(Nav.Controls.GridTraversal.Ascend, TraversalButtonDim + "px", TraversalButtonDim + "px");
            SetDim(Nav.Controls.GridTraversal.Prev, TraversalButtonDim + "px", TraversalButtonDim + "px");
            SetDim(Nav.Controls.GridTraversal.Next, TraversalButtonDim + "px", TraversalButtonDim + "px");
        }
    }

    ResetButtonsContainerClone(); // NOTE(matt): This reapplies the sorting Z-rotation
    return Result;
}

function
GetScrollToElement(NodeList, UpperIndex)
{
    var Result = undefined;
    if(UpperIndex === null)
    {
        if(NodeList.length)
        {
            Result = NodeList[0].closest(".cineraIndexProject");
        }
        else
        {
            Result = NodeList.closest(".cineraIndexProject");
        }
    }
    else
    {
        Result = NodeList[UpperIndex];
    }
    return Result;
}

function
EmptyTraversalStack()
{
    while(Nav.TraversalStack.length > 1)
    {
        Nav.TraversalStack.pop();
    }
}

function
GetContainingProjectOfLevel(Level)
{
    var Result = null;
    if(Level.Projects !== null)
    {
        if(Level.Projects.length)
        {
            Result = Level.Projects[0].parentNode;
        }
        else
        {
            Result = Level.Projects.parentNode;
        }
    }
    else if(Level.Entries !== null)
    {
        if(Level.Entries.length)
        {
            Result = Level.Entries[0].closest(".cineraIndexProject");
        }
        else
        {
            Result = Level.Entries.closest(".cineraIndexProject");
        }
    }
    return Result;
}

function
GetContainingProject(ProjectElement)
{
    var Result = null;
    if(ProjectElement.parentNode.classList.contains("cineraIndexProject"))
    {
        Result = ProjectElement.parentNode;
    }
    return Result;
}

function
PushProjectOntoStack(Stack, ContainingProject)
{
    var Project = {
        Element: ContainingProject,
        Projects: ContainingProject.querySelectorAll(":scope > .cineraIndexProject"),
        Entries: ContainingProject.querySelectorAll(":scope > .cineraIndexEntries > div"),
        Index: null,
    };

    if(Project.Projects.length == 0) { Project.Projects = null; }
    if(Project.Entries.length == 0) { Project.Entries = null; }

    var Siblings = ContainingProject.parentNode.querySelectorAll(":scope > .cineraIndexProject");
    Project.Index = GetIndexOfElement(Siblings, ContainingProject);
    Stack.push(Project);
}

function
BuildProjectsStack(TargetLevel)
{
    let ProjectsStack = [];
    var ContainingProject = GetContainingProjectOfLevel(TargetLevel);

    PushProjectOntoStack(ProjectsStack, ContainingProject);

    ContainingProject = GetContainingProject(ProjectsStack[ProjectsStack.length - 1].Element);
    while(ContainingProject)
    {
        PushProjectOntoStack(ProjectsStack, ContainingProject);
        ContainingProject = GetContainingProject(ProjectsStack[ProjectsStack.length - 1].Element);
    }

    return ProjectsStack;
}

function
EmptyTraversalStackIntoProjectsStack()
{
    let ProjectsStack = [];
    while(Nav.TraversalStack.length > 1)
    {
        let ThisLevel = Nav.TraversalStack[Nav.TraversalStack.length - 1];
        PushLevelProjectUniquely(ProjectsStack, ThisLevel);
        Nav.TraversalStack.pop();
    }
    return ProjectsStack;
}

function
DeriveTraversalStack(ProjectsStack, TargetLevel)
{
    if(ProjectsStack && TargetLevel)
    {
        while(ProjectsStack.length > 0)
        {
            var ThisProject = ProjectsStack[ProjectsStack.length - 1];

            var ButtonInfo = { HeadIndex: null, TailIndex: null, ItemCount: null, };
            let PopulationData = {
                Distribution: null,
                ThisLevel: null,
                Prev: null,
                DoingEntries: false,
            };
            PopulationData.ThisLevel = Nav.TraversalStack[Nav.TraversalStack.length - 1];
            PopulationData.Distribution = ComputeItemDistribution(PopulationData.ThisLevel);

            for(var ButtonIndex = 0; ButtonIndex < Nav.Buttons.length; ++ButtonIndex)
            {
                let Button = {
                    Projects: null,
                    Entries: null,
                    HeadIndex: null,
                    TailIndex: null,
                };

                if(PopulationData.Distribution.ProjectsToPlace > 0 || PopulationData.Distribution.EntriesToPlace > 0)
                {
                    ButtonInfo = PopulateButton(PopulationData, Button, ButtonIndex);
                    if(ButtonInfo.HeadIndex <= ThisProject.Index && ButtonInfo.TailIndex >= ThisProject.Index)
                    {
                        var FoundProject = PseudoPushButton(Button);
                        if(FoundProject)
                        {
                            ProjectsStack.pop();
                        }
                        break;
                    }
                    PopulationData.Prev = ButtonInfo;
                }
            }
        }

        if(TargetLevel.HeadIndex !== null && TargetLevel.TailIndex !== null)
        {
            var Descended = false;
            while(true)
            {
                let PopulationData = {
                    Distribution: null,
                    ThisLevel: null,
                    Prev: null,
                    DoingEntries: false,
                };
                PopulationData.ThisLevel = Nav.TraversalStack[Nav.TraversalStack.length - 1];
                PopulationData.Distribution = ComputeItemDistribution(PopulationData.ThisLevel);

                for(var ButtonIndex = 0; ButtonIndex < Nav.Buttons.length; ++ButtonIndex)
                {
                    let Button = {
                        Projects: null,
                        Entries: null,
                        HeadIndex: null,
                        TailIndex: null,
                    };

                    if(PopulationData.Distribution.ProjectsToPlace > 0 || PopulationData.Distribution.EntriesToPlace > 0)
                    {
                        ButtonInfo = PopulateButton(PopulationData, Button, ButtonIndex);
                        if(ButtonInfo.HeadIndex <= TargetLevel.HeadIndex && ButtonInfo.TailIndex >= TargetLevel.TailIndex)
                        {
                            Descended = true;
                            PseudoPushButton(Button);
                            break;
                        }
                        PopulationData.Prev = ButtonInfo;
                    }
                }
                if(!Descended)
                {
                    break;
                }
                else
                {
                    Descended = false;
                }
            }
        }
    }
}

function
GetGenerationOf(Element)
{
    var Result = 0;
    if(Element.classList.contains("cineraIndexProject"))
    {
        ++Result;
        var ContainingProject = GetContainingProject(Element);
        while(ContainingProject)
        {
            ++Result;
            ContainingProject = GetContainingProject(ContainingProject);
        }
    }
    return Result;
}

function
ComputeTargetLevelForViewport()
{
    var Result = {
        Projects: null,
        Entries: null,
        HeadIndex: null,
        TailIndex: null,
    };

    var ViewportTop = window.scrollY;
    var ViewportBottom = ViewportTop + window.innerHeight;

    var ControlsHeight = Nav.Controls.Header.offsetHeight;
    ViewportTop += ControlsHeight;

    var Elements = [];
    for(var ProjectIndex = 0; ProjectIndex < Search.Projects.length; ++ProjectIndex)
    {
        var ThisProject = Search.Projects[ProjectIndex];
        Elements.push(ThisProject.projectTitleElement);
        if(ThisProject.entriesContainer)
        {
            var Entries = ThisProject.entriesContainer.querySelectorAll(":scope > div");
            if(Nav.SortChronological)
            {
                for(var EntryIndex = 0; EntryIndex < Entries.length; ++EntryIndex)
                {
                    Elements.push(Entries[EntryIndex]);
                }
            }
            else
            {
                for(var EntryIndex = Entries.length - 1; EntryIndex >= 0; --EntryIndex)
                {
                    Elements.push(Entries[EntryIndex]);
                }
            }
        }
    }

    var Upper = {
        Element: null,
        Parent: null,
        Type: null,
    };
    var Lower = {
        Element: null,
        Parent: null,
        Type: null,
    };

    for(var i = 0; i < Elements.length; ++i)
    {
        var ElementTop = getElementYOffsetFromPage(Elements[i]);
        if(!Upper.Element)
        {
            if(ElementTop >= ViewportTop)
            {
                Upper.Element = Elements[i];
                Lower.Element = Upper.Element;
            }
        }
        else
        {
            var ElementBottom = ElementTop + Elements[i].scrollHeight;
            if(ElementBottom <= ViewportBottom)
            {
                Lower.Element = Elements[i];
            }
            else
            {
                break;
            }
        }
    }

    Upper.Type = Upper.Element.classList.contains("cineraProjectTitle") ? item_type.PROJECT : item_type.ENTRY;
    Lower.Type = Lower.Element.classList.contains("cineraProjectTitle") ? item_type.PROJECT : item_type.ENTRY;

    Upper.Parent = Upper.Element.closest(".cineraIndexProject");
    Lower.Parent = Lower.Element.closest(".cineraIndexProject");

    if(Upper.Parent == Lower.Parent)
    {
        if(Upper.Type == Lower.Type)
        {
            switch(Upper.Type)
            {
                case item_type.PROJECT:
                    {
                        Result.Projects = Upper.Parent.querySelectorAll(":scope > .cineraIndexProject");
                        Result.HeadIndex = GetIndexOfElement(Result.Projects, Upper.Element);
                        Result.TailIndex = GetIndexOfElement(Result.Projects, Lower.Element);
                    } break;
                case item_type.ENTRY:
                    {
                        Result.Entries = Upper.Parent.querySelectorAll(":scope > .cineraIndexEntries > div");
                        Result.HeadIndex = GetIndexOfElement(Result.Entries, Upper.Element);
                        Result.TailIndex = GetIndexOfElement(Result.Entries, Lower.Element);
                    } break;
            }
            if(!Nav.SortChronological)
            {
                var Temp = Result.HeadIndex;
                Result.HeadIndex = Result.TailIndex;
                Result.TailIndex = Temp;
            }
        }
        else
        {
            Result.Projects = Upper.Parent.querySelectorAll(":scope > .cineraIndexProject");
            if(Result.Projects.length == 0) { Result.Projects = null; }
            Result.Entries = Upper.Parent.querySelectorAll(":scope > .cineraIndexEntries > div");
            if(Result.Entries.length == 0) { Result.Entries = null; }
        }
    }
    else
    {
        var UpperGeneration = GetGenerationOf(Upper.Parent);
        var LowerGeneration = GetGenerationOf(Lower.Parent);
        while(UpperGeneration > LowerGeneration)
        {
            Upper.Parent = GetContainingProject(Upper.Parent);
            --UpperGeneration;
        }
        while(LowerGeneration > UpperGeneration)
        {
            Lower.Parent = GetContainingProject(Lower.Parent);
            --LowerGeneration;
        }

        if(UpperGeneration == 0 && LowerGeneration == 0)
        {
            Upper.Parent = null;
            Lower.Parent = null;
        }

        while(Upper.Parent && Lower.Parent && Upper.Parent != Lower.Parent)
        {
            Upper.Parent = GetContainingProject(Upper.Parent);
            Lower.Parent = GetContainingProject(Lower.Parent);
        }

        if(Upper.Parent != null)
        {
            Result.Projects = Upper.Parent.querySelectorAll(":scope > .cineraIndexProject");
            if(Result.Projects.length == 0) { Result.Projects = null; }
            Result.Entries = Upper.Parent.querySelectorAll(":scope > .cineraIndexEntries > div");
            if(Result.Entries.length == 0) { Result.Entries = null; }
        }
    }

    while(Elements.length > 0)
    {
        Elements.pop();
    }

    return Result;
}

function
ScrollToWithOffset(Element, Offset)
{
    var ScrollTop = getElementYOffsetFromPage(Element);
    ScrollTop -= Offset;
    window.scrollTo(0, ScrollTop);
}

function
PickGridView()
{
    if(GridSizeIsSupported(Nav.GridSize))
    {
        Nav.Controls.View.textContent = "View: 𝑛-ary Grid";
        Nav.ViewType = view_type.GRID;
        if(MaintainingState())
        {
            ClearStateBit(state_bit.VIEW_LIST);
            SetStateBit(state_bit.VIEW_GRID);
        }

        if(!IsQuery())
        {
            var TargetLevel = ComputeTargetLevelForViewport();
            EmptyTraversalStack();
            if(TargetLevel.Projects || TargetLevel.Entries)
            {
                var ProjectsStack = BuildProjectsStack(TargetLevel);
                DeriveTraversalStack(ProjectsStack, TargetLevel);
            }
            Nav.List.classList.add("hidden");
            Nav.GridContainer.classList.remove("hidden");

            UpdateButtons();

            ScrollToWithOffset(Nav.Controls.GridTraversal.Header, Nav.Controls.Header.offsetHeight);
        }
        ScrollCondition = true;
    }
    else
    {
        // TODO(matt): Inform user that grid view is unavailable
    }
}

function
PickListView()
{
    Nav.Controls.View.textContent = "View: List";
    Nav.ViewType = view_type.LIST;
    if(MaintainingState())
    {
        ClearStateBit(state_bit.VIEW_GRID);
        SetStateBit(state_bit.VIEW_LIST);
    }

    if(!IsQuery())
    {
        Nav.List.classList.remove("hidden");
        Nav.GridContainer.classList.add("hidden");
        var LevelBundle = GetTraversalLevelBundle();
        if(LevelBundle.Generation > 1)
        {
            var Element;
            if(LevelBundle.This.Entries !== null)
            {
                Element = GetScrollToElement(LevelBundle.This.Entries, Nav.SortChronological ? LevelBundle.This.HeadIndex : LevelBundle.This.TailIndex);
            }
            else if(LevelBundle.This.Projects !== null)
            {
                Element = GetScrollToElement(LevelBundle.This.Projects, Nav.SortChronological ? LevelBundle.This.HeadIndex : LevelBundle.This.TailIndex);
            }
            ScrollToWithOffset(Element, Nav.Controls.Header.offsetHeight);
        }
    }
    ScrollCondition = false;
}

function
ToggleView()
{
    // NOTE(matt):  While we only have two views, a toggle will suffice.
    clearTimeout(ScrollerFunction);
    ScrollTicking = false;
    if(Nav.ViewType == view_type.GRID)
    {
        PickListView();
    }
    else
    {
        PickGridView();
    }
}

function
ToggleAnimations()
{
    Nav.Transition.Enabled = !Nav.Transition.Enabled;
    if(Nav.Transition.Enabled)
    {
        Nav.Controls.Anim.textContent = "Animations: ✔";
        Nav.Nexus.classList.add("anim");
        ClearStateBit(state_bit.DISABLE_ANIMATIONS);
    }
    else
    {
        Nav.Controls.Anim.textContent = "Animations: ✘";
        Nav.Nexus.classList.remove("anim");
        SetStateBit(state_bit.DISABLE_ANIMATIONS);
    }
}

function
ToggleSave()
{
    if(MaintainingState())
    {
        Nav.Controls.Save.textContent = "Save Settings: ✘";
        Nav.State = 0;
        Nav.State |= state_bit.NO_SAVE;
        SaveState();
    }
    else
    {
        Nav.Controls.Save.textContent = "Save Settings: ✔";
        Nav.State ^= state_bit.NO_SAVE;
        if(!Nav.Transition.Enabled) { SetStateBit(state_bit.DISABLE_ANIMATIONS); }
        if(!Nav.SortChronological) { SetStateBit(state_bit.SORT_REVERSED); }

        if(Nav.ViewType == view_type.LIST) { SetStateBit(state_bit.VIEW_LIST); }
        else if(Nav.ViewType == view_type.GRID) { SetStateBit(state_bit.VIEW_GRID); }
    }
}

function
BindMenuItem(Item)
{
    // TODO(matt): Enable this to bind the "click" event, making it take a function and parameters
    Item.addEventListener("mouseover", function(ev) { this.classList.add("focused"); });
    Item.addEventListener("mouseout", function(ev) { this.classList.remove("focused"); });
}

function
BindControls()
{
    var SettingsMenu = Nav.Controls.Header.querySelector(".cineraMenu.ViewSettings");
    var SettingsMenuContainer = SettingsMenu.querySelector(".cineraMenuContainer");

    SettingsMenu.addEventListener("mouseenter", function(ev) {
        SettingsMenuContainer.classList.add("visible");
    });

    SettingsMenu.addEventListener("mouseleave", function(ev) {
        SettingsMenuContainer.classList.remove("visible");
    });

    SettingsMenu.addEventListener("click", function(ev) {
        SettingsMenuContainer.classList.toggle("visible");
    });

    BindMenuItem(Nav.Controls.Sort);
    Nav.Controls.Sort.addEventListener("click", function(ev) { ev.stopPropagation(); EnqueueInteraction(interaction_type.SORT); });
    BindMenuItem(Nav.Controls.View);
    Nav.Controls.View.addEventListener("click", function(ev) { ev.stopPropagation(); ToggleView(); });
    BindMenuItem(Nav.Controls.Anim);
    Nav.Controls.Anim.addEventListener("click", function(ev) { ev.stopPropagation(); ToggleAnimations(); });
    BindMenuItem(Nav.Controls.Save);
    Nav.Controls.Save.addEventListener("click", function(ev) { ev.stopPropagation(); ToggleSave(); });

    var Filter = Nav.Controls.Header.querySelector(".cineraMenu.IndexFilter");
    if(Filter)
    {
        var FilterContainer = Filter.querySelector(".cineraMenuContainer");
        // TODO(matt):  Once we have multiple menus, use a menuState on this page
        //              menuState.push(Filter);

        Filter.addEventListener("mouseenter", function(ev) {
            FilterContainer.classList.add("visible");
        });

        Filter.addEventListener("mouseleave", function(ev) {
            FilterContainer.classList.remove("visible");
        });

        Filter.addEventListener("click", function(ev) {
            FilterContainer.classList.toggle("visible");
        });

        var IndexFilterProjects = Filter.querySelectorAll(".cineraFilterProject");
        for(var i = 0; i < IndexFilterProjects.length; ++i)
        {
            IndexFilterProjects[i].addEventListener("mouseover", function(ev) {
                ev.stopPropagation();
                this.classList.add("focused");
                focusSprite(this);
            });
            IndexFilterProjects[i].addEventListener("mouseout", function(ev) {
                ev.stopPropagation();
                this.classList.remove("focused");
                unfocusSprite(this);
            });
            IndexFilterProjects[i].addEventListener("click", function(ev) {
                ev.stopPropagation();
                toggleEntriesOfProjectAndChildren(this);
            });
        }
    }

    Search.QueryElement.addEventListener("input", function(ev) {
        history.replaceState(null, null, "#" + encodeURIComponent(Search.QueryElement.value));
        runSearch();
    });

    Nav.Controls.GridTraversal.Prev.addEventListener("click", function() { EnqueueInteraction(interaction_type.SIBLING_SHIFT_PREV) });
    Nav.Controls.GridTraversal.Ascend.addEventListener("click", function() { EnqueueInteraction(interaction_type.ASCEND) });
    Nav.Controls.GridTraversal.Next.addEventListener("click", function() { EnqueueInteraction(interaction_type.SIBLING_SHIFT_NEXT) });

    BindHelp(Nav.Controls.Help, Nav.Controls.HelpDocumentation);
}

function
InitButtons()
{
    if(GridSizeIsSupported(Nav.GridSize))
    {
        var ButtonPrototype = document.createElement("div");
        ButtonPrototype.classList.add("cineraButton", "subdivision");
        for(var i = 0; i < Nav.GridSize.X * Nav.GridSize.Y; ++i)
        {
            Nav.ButtonsContainer.appendChild(ButtonPrototype.cloneNode());
        }

        var Buttons = Nav.ButtonsContainer.querySelectorAll(".cineraButton.subdivision");
        for(let j = 0; j < Buttons.length; ++j)
        {
            let Button = {
                Element: Buttons[j],
                Projects: [],
                Entries: [],
                HeadIndex: null,
                TailIndex: null,
            };

            Buttons[j].addEventListener("click", function() {
                let InteractionData = {
                    Element: this,
                    Button: Button,
                };
                EnqueueInteraction(interaction_type.PUSH_BUTTON, InteractionData);
            });

            Nav.Buttons.push(Button);
        }
    }
}

function
ReinitButtons()
{
    for(; Nav.Buttons.length > 0;)
    {
        Nav.Buttons[0].Element.remove();
        Nav.Buttons.shift();
    }
    InitButtons();
}

function
PushLevelProjectUniquely(Stack, Level)
{
    if(Level.HeadIndex == null && Level.TailIndex == null)
    {
        var Found = false;
        var ContainingProject = GetContainingProjectOfLevel(Level);

        for(var i = 0; i < Stack.length; ++i)
        {
            if(ContainingProject === Stack[i].Element)
            {
                Found = true;
                break;
            }
        }

        if(!Found)
        {
            PushProjectOntoStack(Stack, ContainingProject);
        }
    }
}

function
ButtonContainsLevel(Button, Level)
{
    var Result = false;
    if(NodesMatch(Button.Projects, Level.Projects) && 
        NodesMatch(Button.Entries, Level.Entries) && 
        Button.HeadIndex <= Level.HeadIndex &&
        Button.TailIndex >= Level.TailIndex)
    {
        Result = true;
    }
    return Result;
}

function
PopulateButton(PopulationData, Button, ButtonIndex)
{
    var Result;
    if(PopulationData.Distribution.ProjectsToPlace > 0)
    {
        Button.Projects = PopulationData.ThisLevel.Projects;
        if(PopulationData.Distribution.ProjectsToPlace == 1 || PopulationData.Distribution.ProjectsToPlace == PopulationData.Distribution.ButtonsForProjects - ButtonIndex)
        {
            PopulationData.Distribution.FullButtonProjectCount = 1;
        }

        Result = SetButtonInfo(Button, PopulationData.Prev, PopulationData.ThisLevel, PopulationData.Distribution);
        if(Result.ItemCount == 1)
        {
            Button.Projects = PopulationData.ThisLevel.Projects[Result.HeadIndex];
        }
        PopulationData.Distribution.ProjectsToPlace -= Result.ItemCount;
    }
    else
    {
        Button.Entries = PopulationData.ThisLevel.Entries;
        if(!PopulationData.DoingEntries)
        {
            PopulationData.Prev = null;
            PopulationData.DoingEntries = true;
        }

        if(PopulationData.Distribution.EntriesToPlace == 1 || PopulationData.Distribution.EntriesToPlace == PopulationData.Distribution.ButtonsForEntries - ButtonIndex)
        {
            PopulationData.Distribution.FullButtonEntryCount = 1;
        }

        Result = SetButtonInfo(Button, PopulationData.Prev, PopulationData.ThisLevel, PopulationData.Distribution);
        if(Result.ItemCount == 1)
        {
            Button.Entries = Button.Entries[Result.HeadIndex];
        }
        PopulationData.Distribution.EntriesToPlace -= Result.ItemCount;
    }
    return Result;
}

function
PseudoPushButton(Button)
{
    var ButtonIsProjectOrEntry = false;

    var Level = {
        Projects: Button.Projects,
        Entries: Button.Entries,
        HeadIndex: Button.HeadIndex,
        TailIndex: Button.TailIndex,
    };

    if(Level.Projects !== null || Level.Entries !== null)
    {
        if(Level.Projects !== null)
        {
            if(Level.Projects.length === undefined)
            {
                var Entries = Level.Projects.querySelectorAll(":scope > .cineraIndexEntries > div");
                var Projects = Level.Projects.querySelectorAll(":scope > .cineraIndexProject");
                Level.Entries = Entries.length ? Entries : null;
                Level.Projects = Projects.length ? Projects : null;
                ButtonIsProjectOrEntry = true;
            }
            Nav.TraversalStack.push(Level);
        }
        else
        {
            if(Level.Entries.length === undefined)
            {
                ButtonIsProjectOrEntry = true;
            }
            else
            {
                Nav.TraversalStack.push(Level);
            }
        }
    }

    return ButtonIsProjectOrEntry;
}

function
ResizeFunction()
{
    var OriginalScrollX = scrollX;
    var OriginalScrollY = scrollY;
    CineraProps.Orientation = GetRealOrientation(orientations.LANDSCAPE_LEFT, CineraProps.IsMobile);
    if(CineraProps.IsMobile)
    {
        UseOrientation(CineraProps.Orientation);
    }
    var NewGridSize = ComputeOptimalGridSize();
    if(Nav.GridSize !== NewGridSize)
    {
        UnbindGridKeys();
        Nav.GridSize = NewGridSize;
        ReinitButtons();
        BindGridKeys();
        SetHelpKeyAvailability(Nav.GridSize)
        if(GridSizeIsSupported(Nav.GridSize))
        {
            var TargetLevel = Nav.TraversalStack[Nav.TraversalStack.length - 1];
            var ProjectsStack = EmptyTraversalStackIntoProjectsStack();
            DeriveTraversalStack(ProjectsStack, TargetLevel);
        }
        else if(Nav.ViewType == view_type.GRID)
        {
            PickListView();
            // TODO(matt):  Inform user that we've switched to the list view
        }
        scroll(OriginalScrollX, OriginalScrollY);
    }
    UpdateButtons();
}

function
InitResizeEventListener()
{
    window.addEventListener("resize", function() {
        if(CineraProps.IsMobile)
        {
            window.setTimeout(ResizeFunction, 512);
        }
        else
        {
            ResizeFunction();
        }
    });
}

function
InitOrientationChangeListener()
{
    screen.orientation.onchange = function()
    {
        if(CineraProps.IsMobile)
        {
            window.setTimeout(ResizeFunction, 512);
        }
        else
        {
            ResizeFunction();
        }
    };
}
//
// Presenting / Navigating (Laying out and traversing the grid, and sorting)
