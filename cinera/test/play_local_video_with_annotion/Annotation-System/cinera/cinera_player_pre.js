"use strict";

var devices = {
    DESKTOP: 0,
    MOBILE: 1,
};

var vod_platform = {
    DIRECT:  0,
    VIMEO:   1,
    YOUTUBE: 2,
};

function
GetVODPlatformFromString(VODPlatformString)
{
    var Result = null;
    switch(VODPlatformString)
    {
        case "direct": Result = vod_platform.DIRECT; break;
        case "vimeo": Result = vod_platform.VIMEO; break;
        case "youtube": Result = vod_platform.YOUTUBE; break;
        default: break;
    }
    return Result;
}

var focus_level = {
    ITEM:       0,
    IDENTIFIER: 1,
};

var menu_id = {
    UNSET:     -1,
    MARKERS:    0,
    QUOTES:     1,
    REFERENCES: 2,
    FILTER:     3,
    VIEWS:      4,
    LINK:       5,
    CREDITS:    6,
    COUNT:      7,
};

var trigger_id = {
    KEYBOARD:   0,
    MOUSE:      1,
};

var views = {
    REGULAR: 0,
    THEATRE: 1,
    SUPERTHEATRE: 2,
};

// refsCallback: (optional)
//   Will be called when the player enters a marker that has a `data-ref` attribute. The value of `data-ref` will be passed to the function.
//   When leaving a marker that a `data-ref` attribute, and entering a marker without one (or not entering a new marker at all), the function will be called with `null`.
function Player(cineraElement, refsCallback) {
    this.root = cineraElement;
    this.container = this.root.querySelector(".cineraPlayerContainer")

    this.originalTextContent = {
        TitleQuotes: null,
        TitleReferences: null,
        TitleCredits: null,
        EpisodePrev: null,
        EpisodeNext: null,
    };

    this.prevEpisode = this.container.querySelector(".episodeMarker.prev");
    if(this.prevEpisode) { this.originalTextContent.EpisodePrev = this.prevEpisode.firstChild.textContent; }
    this.nextEpisode = this.container.querySelector(".episodeMarker.next");
    if(this.nextEpisode) { this.originalTextContent.EpisodeNext = this.nextEpisode.firstChild.textContent; }

    this.videoContainer = this.container.querySelector(".video_container");
    this.refsCallback = refsCallback || function() {};


    if (!(this.videoContainer.getAttribute("data-platform") || this.videoContainer.getAttribute("data-videoId"))) {
        console.error("Expected to find data-platform and data-videoId attribute on", this.videoContainer, "for player initialized on", this.container);
        throw new Error("Missing data-platform or data-videoId attribute.");
    }

    var colouredItems = this.container.querySelectorAll(".author, .member, .project");
    for(var i = 0; i < colouredItems.length; ++i)
    {
        setTextLightness(colouredItems[i]);
    }

    var topicDots = this.root.querySelectorAll(".category");
    for(var i = 0; i < topicDots.length; ++i)
    {
        setDotLightness(topicDots[i]);
    }

    this.titleBar = this.root.querySelector(".cineraMenus");

    this.MenusFocused = {
        MenuID: menu_id.UNSET,
        Item: null,
        Identifier: null,
    };

    this.Menus = [];
    this.Menus.length = menu_id.COUNT;
    this.Menus[menu_id.MARKERS] = {
        Container: this.container.querySelector(".markers_container"),
        Elements: null,
        Item: { LastFocused: null, },
        Scroll: { To: -1, Position: 0, },
    };
    this.Menus[menu_id.QUOTES] = {
        Container: null,
        Elements: null, // The "Source" part of each Item
        Item: { LastFocused: null, },
        Identifier: { LastFocused: null, },
        Scroll: { To: -1, Position: 0, },
    };
    this.Menus[menu_id.REFERENCES] = {
        Container: null,
        Elements: null, // The "Source" part of each Item
        Item: { LastFocused: null, },
        Identifier: { LastFocused: null, },
        Scroll: { To: -1, Position: 0, },
    };
    this.Menus[menu_id.FILTER] = {
        Container: null,
        Elements: null,
        Category: { LastFocused: null, },
        Topic: { LastFocused: null, },
        Medium: { LastFocused: null, },
        Scroll: { To: -1, Position: 0, },
    };
    this.Menus[menu_id.VIEWS] = {
        Toggler: null,
        Container: null,
    };
    this.Menus[menu_id.LINK] = {
        Container: null,
    };
    this.Menus[menu_id.CREDITS] = {
        Container: null,
        Item: { LastFocused: null, },
        Scroll: { To: -1, Position: 0, },
    };

    this.initTitleBar();
    this.Menus[menu_id.MARKERS].Elements = this.Menus[menu_id.MARKERS].Container.querySelectorAll(".marker");

    // NOTE(matt):  All the originalTextContent values must be set by this point, because the player's construction may need them
    if(CineraProps.IsMobile)
    {
        this.InitMobileStyle();
    }

    this.markers = [];
    var markerEls = this.Menus[menu_id.MARKERS].Elements;
    if (markerEls.length == 0) {
        console.error("No markers found in", this.Menus[menu_id.MARKERS].Container, "for player initialized on", this.container);
        throw new Error("Missing markers.");
    }
    for (var i = 0; i < markerEls.length; ++i) {
        var markerEl = markerEls[i];
        var marker = {
            timestamp: parseFloat(markerEl.getAttribute("data-timestamp")),
            ref: markerEl.getAttribute("data-ref"),
            endTime: (i < markerEls.length - 1 ? parseFloat(markerEls[i+1].getAttribute("data-timestamp")) : null),
            el: markerEl,
            fadedProgress: markerEl.querySelector(".progress.faded"),
            progress: markerEl.querySelector(".progress.main"),
            hoverx: null
        };
        marker.el.addEventListener("click", this.onMarkerClick.bind(this, marker));
        marker.el.addEventListener("mousemove", this.onMarkerMouseMove.bind(this, marker));
        marker.el.addEventListener("mouseenter", this.onMarkerMouseEnter.bind(this, marker));
        marker.el.addEventListener("mouseleave", this.onMarkerMouseLeave.bind(this, marker));
        this.markers.push(marker);
    }

    this.vod_platform = GetVODPlatformFromString(this.videoContainer.getAttribute("data-platform"));
    this.currentMarker = null;
    this.currentMarkerIdx = null;

    this.platformPlayer = null;
    this.platformPlayerReady = false;

    this.duration = null;
    this.playing = false;
    this.shouldPlay = false;
    this.buffering = false;
    this.pauseAfterBuffer = false;
    this.speed = 1;
    this.currentTime = -1;
    this.desiredTime = -1;

    this.nextFrame = null;
    this.looping = false;

    this.Menus[menu_id.MARKERS].Container.addEventListener("wheel", function(ev) {
        this.Menus[menu_id.MARKERS].Scroll.To = -1;
    }.bind(this));

    Player.initializePlatform(this.vod_platform, this.onPlatformReady.bind(this));

    this.updateSize();

    this.cineraViewStorageItem = "cineraView";
    if(this.Menus[menu_id.VIEWS].Toggler && localStorage.getItem(this.cineraViewStorageItem))
    {
        this.toggleTheatreMode();
    }

    FlipClear();

    this.resume();

    InitScrollEventListener(this.root, CineraProps.IsMobile, null);

    this.lastTimestampStorageItem = "cineraTimecode_" + window.location.pathname;
    var lastTimestamp;
    if(location.hash) {
        this.setTimeThenPlay(location.hash.startsWith('#') ? location.hash.substr(1) : location.hash);
    }
    else if(lastTimestamp = localStorage.getItem(this.lastTimestampStorageItem))
    {
        this.setTimeThenPlay(lastTimestamp);
    }
}

Player.prototype.addMenuTogglingMouseListeners = function(MenuID)
{
    var player = this;
    var menuToggler = player.Menus[MenuID].Container.closest(".menu");
    menuToggler.addEventListener("mouseenter", function(ev) {
        player.handleMenuTogglerInteraction(this, ev.type);
    })
    menuToggler.addEventListener("mouseleave", function(ev) {
        player.handleMenuTogglerInteraction(this, ev.type);
    })
    menuToggler.addEventListener("click", function(ev) {
        player.handleMenuTogglerInteraction(this, ev.type);
    })
}

Player.prototype.addReferencesOrQuotesMouseListeners = function(MenuID)
{
    var player = this;
    var Items = player.Menus[MenuID].Container.querySelectorAll(".ref");
    for(var i = 0; i < Items.length; ++i)
    {
        Items[i].addEventListener("mouseenter", function(ev) {
            player.mouseOverReferencesOrQuotes(MenuID, this);
        })
    };

    // The "Source" part of each Item
    player.Menus[MenuID].Elements = player.Menus[MenuID].Container.querySelectorAll(".refs .ref");
    for (var i = 0; i < player.Menus[MenuID].Elements.length; ++i) {
        player.Menus[MenuID].Elements[i].addEventListener("click", function(ev) {
            player.pause();
        });
    }

    var Timecodes = player.Menus[MenuID].Container.querySelectorAll(".refs .ref .ref_indices .timecode");
    for (var i = 0; i < Timecodes.length; ++i) {
        Timecodes[i].addEventListener("click", function(ev) {
            var time = ev.currentTarget.getAttribute("data-timestamp");
            mouseSkipToTimecode(player, time, ev);
            player.setScroller(player.Menus[MenuID], this.closest(".ref"), true, false);
        });

        Timecodes[i].addEventListener("mouseenter", function(ev) {
            player.mouseOverReferenceOrQuoteIdentifier(MenuID, this);
        });
    }
}

Player.prototype.initMenu_Quotes = function()
{
    var player = this;
    var MenuID = menu_id.QUOTES;
    player.Menus[MenuID].Container = player.titleBar.querySelector(".quotes_container");
    if(player.Menus[MenuID].Container)
    {
        player.originalTextContent.TitleQuotes = player.Menus[MenuID].Container.previousElementSibling.textContent;
        player.addReferencesOrQuotesMouseListeners(MenuID);
        player.addMenuTogglingMouseListeners(MenuID);
    }
}

Player.prototype.initMenu_References = function()
{
    var player = this;
    var MenuID = menu_id.REFERENCES;
    player.Menus[MenuID].Container = player.titleBar.querySelector(".references_container");
    if(player.Menus[MenuID].Container)
    {
        player.originalTextContent.TitleReferences = player.Menus[MenuID].Container.previousElementSibling.textContent;
        player.addReferencesOrQuotesMouseListeners(MenuID);
        player.addMenuTogglingMouseListeners(MenuID);
    }
}

Player.prototype.initMenu_Filter = function()
{
    var player = this;
    var MenuID = menu_id.FILTER;
    player.Menus[MenuID].Container = player.titleBar.querySelector(".filter_container");
    if(player.Menus[MenuID].Container)
    {
        player.filter = player.Menus[MenuID].Container.parentNode;

        player.filterModeElement = player.filter.querySelector(".filter_mode");
        player.filterModeElement.addEventListener("click", function(ev) {
            ev.stopPropagation();
            player.toggleFilterMode();
        });

        player.filterMode = player.filterModeElement.classList[1];
        player.Menus[menu_id.FILTER].Elements = player.filter.querySelectorAll(".filter_content");

        player.filterInitState = new Object();
        player.filterState = new Object();
        for(var i = 0; i < player.Menus[menu_id.FILTER].Elements.length; ++i)
        {
            var Item = player.Menus[menu_id.FILTER].Elements[i];
            Item.addEventListener("mouseenter", function(ev) {
                player.navigateFilter(this);
            })

            Item.addEventListener("click", function(ev) {
                ev.stopPropagation();
                player.filterItemToggle(this);
            });

            var filterItemName = Item.classList.item(1);
            if(Item.parentNode.classList.contains("filter_topics"))
            {
                player.filterInitState[filterItemName] = { "type" : "topic", "off": (Item.classList.item(2) == "off") };
                player.filterState[filterItemName] = { "type" : "topic", "off": (Item.classList.item(2) == "off") };
            }
            else
            {
                player.filterInitState[filterItemName] = { "type" : "medium", "off": (Item.classList.item(2) == "off") };
                player.filterState[filterItemName] = { "type" : "medium", "off": (Item.classList.item(2) == "off") };
            }
        }

        player.addMenuTogglingMouseListeners(MenuID);
    }
}

Player.prototype.initMenu_Views = function()
{
    var player = this;
    var MenuID = menu_id.VIEWS;
    player.Menus[MenuID].Toggler = player.titleBar.querySelector(".views");
    if(player.Menus[MenuID].Toggler && !CineraProps.IsMobile)
    {
        player.Menus[MenuID].Container = player.Menus[MenuID].Toggler.querySelector(".views_container");
        player.Menus[MenuID].Toggler.addEventListener("mouseenter", function(ev) {
            player.handleMouseOverViewsMenu();
        });
        player.Menus[MenuID].Toggler.addEventListener("mouseleave", function(ev) {
            player.Menus[MenuID].Container.classList.remove("visible");
            player.MenusFocused.MenuID = menu_id.UNSET;
        });

        player.viewItems = player.Menus[MenuID].Toggler.querySelectorAll(".view");
        for(var i = 0; i < player.viewItems.length; ++i)
        {
            player.viewItems[i].addEventListener("click", function(ev) {
                switch(this.getAttribute("data-id"))
                {
                    case "regular":
                    case "theatre":
                        {
                            player.toggleTheatreMode();
                        } break;
                    case "super":
                        {
                            player.toggleSuperTheatreMode();
                        } break;
                }
            });
        }

        player.addMenuTogglingMouseListeners(MenuID);
    }
}

Player.prototype.initMenu_Link = function()
{
    var player = this;
    var MenuID = menu_id.LINK;
    player.Menus[MenuID].Container = player.titleBar.querySelector(".link_container");
    if(player.Menus[MenuID].Container)
    {
        player.linkMode = player.Menus[MenuID].Container.querySelector("#cineraLinkMode");
        player.link = player.Menus[MenuID].Container.querySelector("#cineraLink");
        player.linkTimestamp = true;

        player.linkMode.addEventListener("click", function(ev) {
            ev.stopPropagation();
            player.toggleLinkMode();
        });

        player.link.addEventListener("click", function(ev) {
            player.CopyToClipboard(player.link);
            player.toggleMenuVisibility(MenuID, trigger_id.MOUSE);
        });

        player.addMenuTogglingMouseListeners(MenuID);
    }
}

Player.prototype.initMenu_Credits = function()
{
    var player = this;
    var MenuID = menu_id.CREDITS;
    player.Menus[MenuID].Container = player.titleBar.querySelector(".credits_container");
    if(player.Menus[MenuID].Container)
    {
        player.originalTextContent.TitleCredits = player.Menus[MenuID].Container.previousElementSibling.textContent;

        var creditItems = player.Menus[MenuID].Container.querySelectorAll(".person, .support");
        for(var i = 0; i < creditItems.length; ++i)
        {
            var creditItem = creditItems[i];
            creditItem.addEventListener("mouseenter", function(ev) {
                player.mouseOverCredits(this);
            });
            if(creditItem.tagName == "A")
            {
                creditItem.addEventListener("click", function(ev) {
                    player.pause();
                });
            }
        }

        player.addMenuTogglingMouseListeners(MenuID);
    }
}

Player.prototype.initMenus = function()
{
    this.initMenu_Quotes();
    this.initMenu_References();
    this.initMenu_Filter();
    this.initMenu_Views();
    this.initMenu_Link();
    this.initMenu_Credits();
}

Player.prototype.initTitleBar = function()
{
    if(this.titleBar)
    {
        this.initMenus();

        this.helpButton = this.titleBar.querySelector(".cineraHelp");
        this.helpDocumentation = this.helpButton.querySelector(".help_container");
        BindHelp(this.helpButton, this.helpDocumentation);
    }
}

// Start playing the video from the current position.
// If the player hasn't loaded yet, it will autoplay when ready.
Player.prototype.play = function() {
    if (this.platformPlayerReady) {
        if (!this.playing) {
            switch(this.vod_platform)
            {
                case vod_platform.DIRECT:
                    {
                        this.platformPlayer.play();
                    } break;
                case vod_platform.VIMEO:
                    {
                        this.platformPlayer.play();
                    } break;
                case vod_platform.YOUTUBE:
                    {
                        this.platformPlayer.playVideo();
                    } break;
            }
            this.pauseAfterBuffer = false;
        } else {
            this.shouldPlay = true;
        }
    }
};

// Pause the video at the current position.
// If the player hasn't loaded yet, it will not autoplay when ready. (This is the default)
Player.prototype.pause = function() {
    if (this.platformPlayerReady) {
        if (this.playing) {
            switch(this.vod_platform)
            {
                case vod_platform.DIRECT:
                    {
                        this.platformPlayer.pause();
                    } break;
                case vod_platform.VIMEO:
                    {
                        this.platformPlayer.pause();
                    } break;
                case vod_platform.YOUTUBE:
                    {
                        this.platformPlayer.pauseVideo();
                    } break;
            }
        } else if (this.buffering) {
            this.pauseAfterBuffer = true;
        }
    } else {
        this.shouldPlay = false;
    }
};

// Sets the current time then plays.
// If the player hasn't loaded yet, it will seek to this time when ready.
Player.prototype.setTimeThenPlay = function(time) {
    this.desiredTime = time;
    switch(this.vod_platform)
    {
        case vod_platform.DIRECT:
            {
                if (this.platformPlayerReady) {
                    this.desiredTime = Math.max(0, Math.min(this.desiredTime, this.duration));
                    this.platformPlayer.currentTime = this.desiredTime;
                    this.updateProgress();
                    this.play();
                }
            } break;
        case vod_platform.VIMEO:
            {
                if (this.platformPlayerReady) {
                    this.desiredTime = Math.max(0, Math.min(this.desiredTime, this.duration));
                    var Parent = this;
                    this.platformPlayer.setCurrentTime(this.desiredTime)
                        .then(function() {
                            Parent.updateProgress();
                            Parent.play();
                        });
                }
            } break;
        case vod_platform.YOUTUBE:
            {
                if (this.platformPlayerReady) {
                    this.desiredTime = Math.max(0, Math.min(this.desiredTime, this.duration));
                    this.platformPlayer.seekTo(this.desiredTime);
                    this.updateProgress();
                    this.play();
                }
            } break;
    }
};

Player.prototype.jumpToNextMarker = function() {
    var targetMarkerIdx = Math.min((this.currentMarkerIdx === null ? 0 : this.currentMarkerIdx + 1), this.markers.length-1);
    var targetTime = this.markers[targetMarkerIdx].timestamp;
    while(targetMarkerIdx < this.markers.length && this.markers[targetMarkerIdx].el.classList.contains("skip"))
    {
        ++targetMarkerIdx;
        targetTime = this.markers[targetMarkerIdx].timestamp;
    }
    this.setTimeThenPlay(targetTime);
};

Player.prototype.jumpToPrevMarker = function() {
    var targetMarkerIdx = Math.max(0, (this.currentMarkerIdx === null ? 0 : this.currentMarkerIdx - 1));
    var targetTime = this.markers[targetMarkerIdx].timestamp;
    while(targetMarkerIdx >= 0 && this.markers[targetMarkerIdx].el.classList.contains("skip"))
    {
        --targetMarkerIdx;
        targetTime = this.markers[targetMarkerIdx].timestamp;
    }
    this.setTimeThenPlay(targetTime);
};

function
GetHeightOfHideableElement(Element, UnhidingClass)
{
    var Result = 0;
    if(Element.classList.contains(UnhidingClass))
    {
        Result = Element.offsetHeight;
    }
    else
    {
        var ZOffset = Element.style.zOffset;
        Element.style.zOffset = -1;
        Element.classList.add(UnhidingClass);

        Result = Element.offsetHeight;

        Element.classList.remove(UnhidingClass);
        Element.style.zOffset = ZOffset;
    }
    return Result;
}

function
GetWidthOfHideableElement(Element, UnhidingClass)
{
    var Result = 0;
    if(Element.classList.contains(UnhidingClass))
    {
        Result = Element.offsetWidth;
    }
    else
    {
        var ZOffset = Element.style.zOffset;
        Element.style.zOffset = -1;
        Element.classList.add(UnhidingClass);

        Result = Element.offsetWidth;

        Element.classList.remove(UnhidingClass);
        Element.style.zOffset = ZOffset;
    }
    return Result;
}

function
ComputeHorizontalOffsetForMenu(Menu, Toggler, VideoContainerDimX)
{
    var Result = 0;
    var MenuWidth = GetWidthOfHideableElement(Menu, "visible");
    var TogglerWidth = Toggler.offsetWidth;

    var TogglerOffset = Toggler.offsetLeft;
    var Result = TogglerOffset + (TogglerWidth / 2) - (MenuWidth / 2);

    var Protrusion = MenuWidth + Result - VideoContainerDimX;
    if(Protrusion > 0)
    {
        Result -= Protrusion;
    }

    if(Result < 0)
    {
        Result = 0;
    }
    return Result;
}

function
ComputeVerticalOffsetForMenu(Menu, Toggler, VideoContainerDimY)
{
    var Result = 0;
    var MenuHeight = GetHeightOfHideableElement(Menu, "visible");
    var TogglerHeight = Toggler.offsetHeight;

    var TogglerOffset = Toggler.offsetTop;
    var Result = TogglerOffset + (TogglerHeight / 2) - (MenuHeight / 2);

    var LowerProtrusion = MenuHeight + Result - VideoContainerDimY;
    if(LowerProtrusion > 0)
    {
        Result -= LowerProtrusion;
    }

    if(Result < 0)
    {
        Result = 0;
    }
    return Result;
}

function sizeAndPositionMenuContainer(TitleBar, SizerElement, Menu)
{
    if(Menu)
    {
        var Toggler = Menu.parentElement;

        var TitleBarDimX = TitleBar.offsetWidth;
        var TitleBarDimY = TitleBar.offsetHeight;
        var SizerElementDimX = SizerElement.offsetWidth;
        var SizerElementDimY = SizerElement.offsetHeight;

        var ContainerDimX = SizerElementDimX;
        var ContainerDimY = SizerElementDimY;

        switch(CineraProps.O)
        {
            case orientations.PORTRAIT:
                {
                    Menu.style.borderTopWidth = 0;
                    Menu.style.borderTopStyle = "none";
                    Menu.style.borderRightWidth = "1px";
                    Menu.style.borderRightStyle = "solid";
                    Menu.style.borderLeftWidth = "1px";
                    Menu.style.borderLeftStyle = "solid";

                    Menu.style.maxWidth = ContainerDimX + "px";
                    ContainerDimY -= TitleBarDimY;
                    Menu.style.maxHeight = ContainerDimY + "px";

                    var MenuHorizontalOffset = ComputeHorizontalOffsetForMenu(Menu, Toggler, SizerElementDimX);

                    Menu.style.top = TitleBarDimY + "px";
                    Menu.style.left = MenuHorizontalOffset + "px";
                } break;
            case orientations.LANDSCAPE_LEFT:
                {
                    Menu.style.borderTopWidth = "1px";
                    Menu.style.borderTopStyle = "solid";
                    Menu.style.borderRightWidth = "1px";
                    Menu.style.borderRightStyle = "solid";
                    Menu.style.borderLeftWidth = 0;
                    Menu.style.borderLeftStyle = "none";

                    ContainerDimX -= TitleBarDimX;
                    Menu.style.maxWidth = ContainerDimX + "px";
                    Menu.style.maxHeight = ContainerDimY + "px";

                    var MenuVerticalOffset = ComputeVerticalOffsetForMenu(Menu, Toggler, SizerElementDimY);

                    Menu.style.top = MenuVerticalOffset + "px";
                    Menu.style.left = TitleBarDimX + "px";
                } break;
            case orientations.LANDSCAPE_RIGHT:
                {
                    Menu.style.borderTopWidth = "1px";
                    Menu.style.borderTopStyle = "solid";
                    Menu.style.borderRightWidth = 0;
                    Menu.style.borderRightStyle = "none";
                    Menu.style.borderLeftWidth = "1px";
                    Menu.style.borderLeftStyle = "solid";

                    ContainerDimX -= TitleBarDimX;
                    Menu.style.maxWidth = ContainerDimX + "px";
                    Menu.style.maxHeight = ContainerDimY + "px";

                    var MenuVerticalOffset = ComputeVerticalOffsetForMenu(Menu, Toggler, SizerElementDimY);
                    var MenuWidth = GetWidthOfHideableElement(Menu, "visible");

                    Menu.style.top = MenuVerticalOffset + "px";
                    Menu.style.left = -MenuWidth + "px";
                } break;

        }
    }
}

function
ComputeTallest(Elements, UnhidingClass)
{
    var Result = null;
    for(var i = 0; i < Elements.length; ++i)
    {
        var This = Elements[i];
        var Height = UnhidingClass ? GetHeightOfHideableElement(This, UnhidingClass) : This.offsetHeight;
        if(Height > Result)
        {
            Result = Height;
        }
    }
    return Result;
}

function
ComputeAndSetTallest(Selector, Elements, UnhidingClass)
{
    var Result;
    Selector.style.height = "unset";
    Result = ComputeTallest(Elements, UnhidingClass);
    Selector.style.height = Result + "px";
    return Result;
}

Player.prototype.ApplyMobileStyle = function(VideoContainer)
{
    var WindowDim = DeriveReliableWindowDimensions();
    var MaxWidth = MaxWidthOfElement(this.root, WindowDim);
    var MaxHeight = MaxHeightOfElement(this.root, WindowDim);

    var IndicesBar = this.Menus[menu_id.MARKERS].Container;

    var Markers = IndicesBar.querySelector(".markers");
    var CineraContentWidth = MaxWidth;

    var EpisodeMarkers = IndicesBar.querySelectorAll(".episodeMarker");
    for(var i = 0; i < EpisodeMarkers.length; ++i)
    {
        CineraContentWidth -= EpisodeMarkers[i].offsetWidth;
    }

    switch(CineraProps.O)
    {
        case orientations.PORTRAIT:
            {
                this.root.style.flexDirection = "column";
                this.titleBar.style.flexDirection = "row";
            } break;
        case orientations.LANDSCAPE_LEFT:
            {
                this.root.style.flexDirection = "row";
                this.titleBar.style.flexDirection = "column-reverse";
                CineraContentWidth -= this.titleBar.offsetWidth;
            } break;
        case orientations.LANDSCAPE_RIGHT:
            {
                this.root.style.flexDirection = "row-reverse";
                this.titleBar.style.flexDirection = "column";
                CineraContentWidth -= this.titleBar.offsetWidth;
            } break;
    }

    var HeightOfTallestIndex;
    if(MobileCineraContentRule !== undefined)
    {
        MobileCineraContentRule.style.width = CineraContentWidth + "px";
        HeightOfTallestIndex = ComputeAndSetTallest(MobileCineraContentRule, this.Menus[menu_id.MARKERS].Elements, "current");
        IndicesBar.style.height = HeightOfTallestIndex + "px";
        Markers.style.width = CineraContentWidth + "px";
    }

    var VideoMaxDimX = MaxWidth;
    var VideoMaxDimY = MaxHeight;
    var MinimumVideoHeight = 32;
    if(MaxHeight - HeightOfTallestIndex > MinimumVideoHeight)
    {
        VideoMaxDimY -= HeightOfTallestIndex;
    }

    switch(CineraProps.O)
    {
        case orientations.PORTRAIT:
            {
                VideoMaxDimY -= this.titleBar.offsetHeight;
            } break;
        case orientations.LANDSCAPE_LEFT:
        case orientations.LANDSCAPE_RIGHT:
            {
                VideoMaxDimX -= this.titleBar.offsetWidth;
            } break;
    }

    var VideoDimYFromMaxX = VideoMaxDimX * 9 / 16;
    var VideoDimXFromMaxY = VideoMaxDimY * 16 / 9;

    var VideoDimX = 0;
    var VideoDimY = 0;
    if(VideoDimXFromMaxY > VideoMaxDimX)
    {
        VideoDimX = Math.floor(VideoMaxDimX);
        VideoDimY = Math.floor(VideoDimYFromMaxX);
    }
    else if(VideoDimYFromMaxX > VideoMaxDimY)
    {
        VideoDimY = Math.floor(VideoMaxDimY);
        VideoDimX = Math.floor(VideoDimXFromMaxY);
    }
    else
    {
        VideoDimX = Math.floor(VideoMaxDimX);
        VideoDimY = Math.floor(VideoDimYFromMaxX);
    }

    VideoContainer.style.width = VideoDimX + "px";
    VideoContainer.style.height = VideoDimY + "px";

    sizeAndPositionMenuContainer(this.titleBar, this.root, this.Menus[menu_id.QUOTES].Container);
    sizeAndPositionMenuContainer(this.titleBar, this.root, this.Menus[menu_id.REFERENCES].Container);
    sizeAndPositionMenuContainer(this.titleBar, this.root, this.Menus[menu_id.FILTER].Container);
    sizeAndPositionMenuContainer(this.titleBar, this.root, this.Menus[menu_id.LINK].Container);
    sizeAndPositionMenuContainer(this.titleBar, this.root, this.Menus[menu_id.CREDITS].Container);
}

Player.prototype.IconifyMenuTogglers = function()
{
    if(this.Menus[menu_id.QUOTES].Container)
    {
        this.Menus[menu_id.QUOTES].Container.previousElementSibling.textContent = '\u{1F5E9}';
    }

    if(this.Menus[menu_id.REFERENCES].Container)
    {
        this.Menus[menu_id.REFERENCES].Container.previousElementSibling.textContent = '\u{1F4D6}';
    }

    if(this.Menus[menu_id.CREDITS].Container)
    {
        this.Menus[menu_id.CREDITS].Container.previousElementSibling.textContent = '\u{1F46A}';
    }

    if(this.Menus[menu_id.VIEWS].Toggler)
    {
        this.Menus[menu_id.VIEWS].Toggler.remove();
        this.Menus[menu_id.VIEWS].Toggler = null;
    }
}

Player.prototype.InitMobileControls = function()
{
    var rightmost = {};
    this.Menus[menu_id.MARKERS].Container.style.height = "auto";
    var episodeMarkerFirst = this.Menus[menu_id.MARKERS].Container.querySelector(".episodeMarker.first");
    var episodeMarkerPrev = this.Menus[menu_id.MARKERS].Container.querySelector(".episodeMarker.prev");
    var episodeMarkerNext = this.Menus[menu_id.MARKERS].Container.querySelector(".episodeMarker.next");
    var episodeMarkerLast = this.Menus[menu_id.MARKERS].Container.querySelector(".episodeMarker.last");

    if(episodeMarkerPrev) { episodeMarkerPrev.firstChild.textContent = '\u{23EE}'; }
    if(episodeMarkerNext) { episodeMarkerNext.firstChild.textContent = '\u{23ED}'; rightmost = episodeMarkerNext; }
    else if (episodeMarkerLast) { rightmost = episodeMarkerLast; }

    var controlPrevTimestamp = document.createElement("a");
    controlPrevTimestamp.classList.add("episodeMarker");
    controlPrevTimestamp.classList.add("prevTimestamp");
    var controlPrevTimestampContent = document.createElement("div");
    controlPrevTimestampContent.appendChild(document.createTextNode('\u{25C0}'));
    controlPrevTimestamp.appendChild(controlPrevTimestampContent);

    var markers = this.Menus[menu_id.MARKERS].Container.querySelector(".markers");
    this.Menus[menu_id.MARKERS].Container.insertBefore(controlPrevTimestamp, markers);

    var controlNextTimestamp = document.createElement("a");
    controlNextTimestamp.classList.add("episodeMarker");
    controlNextTimestamp.classList.add("nextTimestamp");
    var controlNextTimestampContent = document.createElement("div");
    controlNextTimestampContent.appendChild(document.createTextNode('\u{25B6}'));
    controlNextTimestamp.appendChild(controlNextTimestampContent);

    if(rightmost)
    {
        this.Menus[menu_id.MARKERS].Container.insertBefore(controlNextTimestamp, rightmost);
    }
    else
    {
        this.Menus[menu_id.MARKERS].Container.appendChild(controlNextTimestamp);
    }
}

Player.prototype.ConnectMobileControls = function()
{
    var player = this;
    var ControlPrevTimestamp = this.Menus[menu_id.MARKERS].Container.querySelector(".episodeMarker.prevTimestamp");
    ControlPrevTimestamp.addEventListener("click", function(ev) {
        player.jumpToPrevMarker();
    });
    var ControlNextTimestamp = this.Menus[menu_id.MARKERS].Container.querySelector(".episodeMarker.nextTimestamp");
    ControlNextTimestamp.addEventListener("click", function(ev) {
        player.jumpToNextMarker();
    });
}

Player.prototype.InitMobileStyle = function()
{
    this.root.classList.add("mobile");
    this.IconifyMenuTogglers();
    this.InitMobileControls();
    this.ConnectMobileControls();
    this.ApplyMobileStyle(this.videoContainer);
}

// Call this after changing the size of the video container in order to update the platform player.
Player.prototype.updateSize = function() {
    var width = 0;
    var height = 0;
    CineraProps.O = GetRealOrientation(orientations.LANDSCAPE_LEFT, CineraProps.IsMobile);
    if(!CineraProps.IsMobile)
    {
        var VisibleArea = MaxDimensionsOfElement(this.container, GetWindowDim(false));
        var AvailableHeight = VisibleArea.Y - this.titleBar.offsetHeight;
        var VerticalScrollBarWidth = this.Menus[menu_id.MARKERS].Container.offsetWidth - this.Menus[menu_id.MARKERS].Container.clientWidth;
        width = VisibleArea.X - (this.Menus[menu_id.MARKERS].Container.scrollWidth + VerticalScrollBarWidth);
        height = width / 16 * 9; // TODO(matt): Get the aspect ratio from the video itself?
        if(height > AvailableHeight)
        {
            height = AvailableHeight;
            width = height / 9 * 16;
        }
        this.Menus[menu_id.MARKERS].Container.style.height = height + "px";

        var VacantPixelsBelowMenus = 4;
        var MenuMaxHeight = height - VacantPixelsBelowMenus;
        MenuContainerRule.style.maxHeight = MenuMaxHeight + "px";
    }
    else
    {
        this.ApplyMobileStyle(this.videoContainer);
        width = this.videoContainer.offsetWidth;
        height = this.videoContainer.offsetHeight;
    }

    if(this.platformPlayerReady)
    {
        switch(this.vod_platform)
        {
            case vod_platform.DIRECT:
                {
                    this.platformPlayer.setAttribute("width", Math.floor(width));
                    this.platformPlayer.setAttribute("height", Math.floor(height));
                } break;
            case vod_platform.VIMEO: break; // NOTE(matt): It responds automatically
            case vod_platform.YOUTUBE:
                {
                    this.platformPlayer.setSize(Math.floor(width), Math.floor(height));
                } break;
            default: break;
        }
    }
}

function
DelayedUpdateSize(player)
{
    player.updateSize();
}

// Stops the per-frame work that the player does. Call when you want to hide or get rid of the player.
Player.prototype.halt = function() {
    this.pause();
    this.looping = false;
    if (this.nextFrame) {
        cancelAnimationFrame(this.nextFrame);
        this.nextFrame = null;
    }
}

// Resumes the per-frame work that the player does. Call when you want to show the player again after hiding.
Player.prototype.resume = function() {
    this.looping = true;
    if (!this.nextFrame) {
        this.doFrame();
    }
}

Player.initializePlatform = function(platform_id, callback) {
    switch(platform_id)
    {
        case vod_platform.DIRECT:
        case vod_platform.VIMEO:
            {
                callback();
            } break;
        case vod_platform.YOUTUBE:
            {
                if(window.YT && window.YT.loaded)
                {
                    callback()
                }
                else
                {
                    if (window.APYoutubeAPIReady === undefined) {
                        window.APYoutubeAPIReady = false;
                        window.APCallbacks = (callback ? [callback] : []);
                        window.onYouTubeIframeAPIReady = function() {
                            window.APYoutubeAPIReady = true;
                            for (var i = 0; i < APCallbacks.length; ++i) {
                                APCallbacks[i]();
                            }
                        };
                    } else if (window.APYoutubeAPIReady === false) {
                        window.APCallbacks.push(callback);
                    } else if (window.APYoutubeAPIReady === true) {
                        callback();
                    }
                }
            } break;
    }
}

// END PUBLIC INTERFACE

Player.prototype.onMarkerClick = function(marker, ev) {
    if(!marker.el.classList.contains("skip"))
    {
        var time = marker.timestamp;
        if (this.currentMarker == marker && marker.hoverx !== null) {
            time += (marker.endTime - marker.timestamp) * marker.hoverx;
        }
        this.setTimeThenPlay(time);
    }
};

Player.prototype.onMarkerMouseMove = function(marker, ev) {
    if(!marker.el.classList.contains("skip"))
    {
        if (this.currentMarker == marker) {
            var CineraContent = this.currentMarker.el.querySelector(".cineraContent");
            marker.hoverx = (ev.pageX - getElementXOffsetFromPage(CineraContent)) / CineraContent.offsetWidth;
        }
    }
};

Player.prototype.onMarkerMouseEnter = function(marker, ev) {
    if(!marker.el.classList.contains("skip"))
    {
        if(this.MenusFocused.MenuID == menu_id.UNSET || this.MenusFocused.MenuID == menu_id.MARKERS)
        {
            this.focusUIElement(focus_level.ITEM, menu_id.MARKERS, this.Menus[menu_id.MARKERS].Item, marker.el);
        }
    }
};

Player.prototype.onMarkerMouseLeave = function(marker, ev) {
    if(!marker.el.classList.contains("skip"))
    {
        marker.hoverx = null;
        var CurrentFocus = this.MenusFocused.MenuID;
        this.unfocusUIElement(focus_level.ITEM);
        if(CurrentFocus != menu_id.MARKERS)
        {
            this.MenusFocused.MenuID = CurrentFocus;
        }
    }
};

function
computeCentreScrollOffset(container, targetTop, targetBottom)
{
    var Result = 0;
    var Bottom = targetBottom.offsetTop + targetBottom.offsetHeight;
    var Midpoint = (Bottom - targetTop.offsetTop) / 2.0;
    Result += Midpoint - container.offsetHeight / 2.0
    return Result;
}

Player.prototype.computeDesiredScrollTo = function(MenuEntity, targetTop, targetBottom, centre)
{
    MenuEntity.Scroll.To = targetTop.offsetTop;
    var container = MenuEntity.Container;
    if(centre)
    {
        MenuEntity.Scroll.To += computeCentreScrollOffset(container, targetTop, targetBottom);
        MenuEntity.Scroll.To = Math.max(0, Math.min(MenuEntity.Scroll.To, targetTop.offsetTop));
    }
    MenuEntity.Scroll.Position = container.scrollTop;
}

Player.prototype.setScrollerRanged = function(MenuEntity, targetTop, targetBottom, centre, calledEveryFrame) {
    if(!calledEveryFrame || this.desiredTime >= 0)
    {
        this.computeDesiredScrollTo(MenuEntity, targetTop, targetBottom, centre);
    }
}

Player.prototype.setScroller = function(MenuEntity, element, centre, calledEveryFrame) {
    if(!calledEveryFrame || this.desiredTime >= 0)
    {
        this.computeDesiredScrollTo(MenuEntity, element, element, centre);
    }
}

Player.prototype.updateProgress = function() {
    var prevMarker = this.currentMarker;
    this.currentMarker = null;
    this.currentMarkerIdx = null;

    for (var i = 0; i < this.markers.length; ++i) {
        var marker = this.markers[i];
        if (marker.timestamp <= this.currentTime && this.currentTime < marker.endTime) {
            this.currentMarker = marker;
            this.currentMarkerIdx = i;
            break;
        }
    }

    if (this.currentMarker) {
        var CineraContent = this.currentMarker.el.querySelector(".cineraContent");
        var totalWidth = CineraContent.offsetWidth;
        var progress = (this.currentTime - this.currentMarker.timestamp) / (this.currentMarker.endTime - this.currentMarker.timestamp);
        if (this.currentMarker.hoverx === null) {
            var pixelWidth = progress * totalWidth;
            this.currentMarker.fadedProgress.style.width = Math.ceil(pixelWidth) + "px";
            this.currentMarker.fadedProgress.style.opacity = pixelWidth - Math.floor(pixelWidth);
            this.currentMarker.progress.style.width = Math.floor(pixelWidth) + "px";
        } else {
            this.currentMarker.fadedProgress.style.opacity = 1;
            this.currentMarker.progress.style.width = Math.floor(Math.min(this.currentMarker.hoverx, progress) * totalWidth) + "px";
            this.currentMarker.fadedProgress.style.width = Math.floor(Math.max(this.currentMarker.hoverx, progress) * totalWidth) + "px";
        }

    }

    if (this.currentMarker != prevMarker) {
        if (prevMarker) {
            prevMarker.el.classList.remove("current");
            prevMarker.fadedProgress.style.width = "0px";
            prevMarker.progress.style.width = "0px";
            prevMarker.hoverx = null;
        }

        if (this.currentMarker) {
            if(this.currentMarkerIdx == this.markers.length - 1)
            {
                localStorage.removeItem(this.lastTimestampStorageItem);
            }
            else
            {
                localStorage.setItem(this.lastTimestampStorageItem, this.currentMarker.timestamp);
            }
            this.currentMarker.el.classList.add("current");

            this.setScroller(this.Menus[menu_id.MARKERS], this.currentMarker.el, true, true);
            this.refsCallback(this.currentMarker.ref, this.currentMarker.el, this);
        } else if (prevMarker && prevMarker.ref) {
            this.refsCallback(null);
        }
    }
}

Player.prototype.smoothScroll = function(MenuEntity)
{
    var container = MenuEntity.Container;
    var scroller = MenuEntity.Scroll;
    var targetPosition = scroller.To;
    targetPosition = Math.max(0, Math.min(targetPosition, container.scrollHeight - container.offsetHeight));
    scroller.Position += (targetPosition - scroller.Position) * 0.1;
    if (Math.abs(scroller.Position - targetPosition) < 1.0) {
        container.scrollTop = targetPosition;
        scroller.To = -1;
    } else {
        container.scrollTop = scroller.Position;
    }
}

Player.prototype.doFrame = function() {
    if (this.playing) {
        switch(this.vod_platform)
        {
            case vod_platform.DIRECT:
                {
                    this.currentTime = this.platformPlayer.currentTime;
                    if(this.desiredTime == -1) { this.desiredTime = this.currentTime; }
                    this.updateProgress();
                } break;
            case vod_platform.VIMEO:
                {
                    var Parent = this;
                    this.platformPlayer.getCurrentTime()
                        .then(function(Result) {
                            Parent.currentTime = Result;
                            if(Parent.desiredTime == -1) { Parent.desiredTime = Parent.currentTime; }
                            Parent.updateProgress();
                        });
                } break;
            case vod_platform.YOUTUBE:
                {
                    this.currentTime = this.platformPlayer.getCurrentTime();
                    if(this.desiredTime == -1) { this.desiredTime = this.currentTime; }
                    this.updateProgress();
                } break;
        }
    }

    if (this.Menus[menu_id.MARKERS].Scroll.To >= 0) {
        this.smoothScroll(this.Menus[menu_id.MARKERS]);
    }

    if(this.Menus[menu_id.QUOTES].Container && this.Menus[menu_id.QUOTES].Scroll.To >= 0) {
        this.smoothScroll(this.Menus[menu_id.QUOTES]);
    }

    if(this.Menus[menu_id.REFERENCES].Container && this.Menus[menu_id.REFERENCES].Scroll.To >= 0) {
        this.smoothScroll(this.Menus[menu_id.REFERENCES]);
    }

    if(this.Menus[menu_id.FILTER].Container && this.Menus[menu_id.FILTER].Scroll.To >= 0) {
        this.smoothScroll(this.Menus[menu_id.FILTER]);
    }

    if(this.Menus[menu_id.CREDITS].Container && this.Menus[menu_id.CREDITS].Scroll.To >= 0) {
        this.smoothScroll(this.Menus[menu_id.CREDITS]);
    }

    if(this.desiredTime == this.currentTime) { this.desiredTime = -1; }

    this.nextFrame = requestAnimationFrame(this.doFrame.bind(this));
    this.updateLink();
};

Player.prototype.setStyleAndQuality = function() {
    switch(this.vod_platform)
    {
        case vod_platform.DIRECT:
            {
                // NOTE(matt): onPlatformReady() has set the width and height
            } break;
        case vod_platform.VIMEO:
            {
                this.platformPlayer.setQuality("1080p");
                var frame = this.videoContainer.querySelector("iframe");
                frame.style.width = "100%";
                frame.style.height = "100%";
                frame.style.position = "absolute"
                frame.style.top = 0;
                frame.style.left = 0;
            } break;
        case vod_platform.YOUTUBE:
            {
                this.platformPlayer.setPlaybackQuality("hd1080");
            } break;
    }
    this.updateSize();
}

Player.prototype.setDurationThenAutoplay = function(Duration) {
    this.duration = Duration;
    this.markers[this.markers.length-1].endTime = this.duration;
    if (this.desiredTime > 0) {
        this.desiredTime = Math.max(0, Math.min(this.desiredTime, this.duration));
        this.setTimeThenPlay(this.desiredTime);
    }
    if (this.shouldPlay) {
        this.play();
    }
}

Player.prototype.acquireDurationThenAutoplay = function() {
    switch(this.vod_platform)
    {
        case vod_platform.DIRECT:
            {
                this.setDurationThenAutoplay(this.platformPlayer.duration);
            } break;
        case vod_platform.VIMEO:
            {
                var Parent = this;
                this.platformPlayer.getDuration()
                    .then(function(Response)
                        {
                            Parent.setDurationThenAutoplay(Response);
                        });
            } break;
        case vod_platform.YOUTUBE:
            {
                this.setDurationThenAutoplay(this.platformPlayer.getDuration());
            } break;
    }
}

Player.prototype.onPlatformPlayerReady = function() {
    this.platformPlayerReady = true;
    this.setStyleAndQuality();
    this.acquireDurationThenAutoplay();
};

Player.prototype.onPlaybackRateChange = function(Rate)
{
    this.speed = Rate;
}

Player.prototype.onDirectPlayerPlaybackRateChange = function(ev) {
    this.onPlaybackRateChange(this.platformPlayer.playbackRate);
};

Player.prototype.onVimeoPlayerPlaybackRateChange = function(ev) {
    this.onPlaybackRateChange(ev.playbackRate);
};

Player.prototype.onYouTubePlayerPlaybackRateChange = function(ev) {
    this.onPlaybackRateChange(ev.data);
};

Player.prototype.onStateBufferStart = function()
{
    this.buffering = true;
    this.updateProgress();
}

Player.prototype.onStateBufferEnd = function()
{
    this.buffering = false;
    this.updateProgress();
}

Player.prototype.onStateEnded = function()
{
    this.buffering = false;
    this.playing = false;
    localStorage.removeItem(this.lastTimestampStorageItem);
    this.currentTime = null;
    this.updateProgress();
}

Player.prototype.onStatePaused = function(CurrentTime)
{
    this.buffering = false;
    this.playing = false;
    this.currentTime = CurrentTime;
    this.updateProgress();
}

Player.prototype.onStatePlaying = function(CurrentTime)
{
    this.buffering = false;
    this.playing = true;
    this.currentTime = CurrentTime;
    if(this.pauseAfterBuffer)
    {
        this.pauseAfterBuffer = false;
        this.pause();
    }
}

Player.prototype.onDirectPlayerStateChange_Paused = function(ev)
{
    this.onStatePaused(this.platformPlayer.currentTime);
}

Player.prototype.onDirectPlayerStateChange_Playing = function(ev)
{
    this.onStatePlaying(this.platformPlayer.currentTime);
}

Player.prototype.onVimeoPlayerStateChange_Paused = function(ev)
{
    this.onStatePaused(ev.seconds);
}

Player.prototype.onVimeoPlayerStateChange_Playing = function(ev)
{
    this.onStatePlaying(ev.seconds);
}

Player.prototype.onYouTubePlayerStateChange = function(ev) {
    switch(ev.data)
    {
        case YT.PlayerState.BUFFERING: { this.onStateBufferStart(); }; break;
        case YT.PlayerState.ENDED: { this.onStateEnded(); }; break;
        case YT.PlayerState.PAUSED: { this.onStatePaused(this.platformPlayer.getCurrentTime()); }; break;
        case YT.PlayerState.PLAYING: { this.onStatePlaying(this.platformPlayer.getCurrentTime()); }; break;
        default: break;
    }
};

Player.prototype.onPlatformReady = function() {
    var platformPlayerDiv = document.createElement("DIV");
    platformPlayerDiv.id = "platform_player_" + Player.platformPlayerCount++;
    var platformPlayerDivPlaced = this.videoContainer.appendChild(platformPlayerDiv);

    switch(this.vod_platform)
    {
        case vod_platform.DIRECT:
            {
                platformPlayerDivPlaced.classList.add("direct_video");
                var videoNode = document.createElement("VIDEO");
                videoNode.controls = true;
                videoNode.setAttribute("width", this.videoContainer.offsetWidth);
                videoNode.setAttribute("height", this.videoContainer.offsetWidth / 16 * 9);
                var videoSourceNode = document.createElement("SOURCE");
                videoSourceNode.setAttribute("src", this.videoContainer.getAttribute("data-videoId"));
                videoNode.appendChild(videoSourceNode);
                var videoTrackNode = document.createElement("TRACK");
                videoTrackNode.setAttribute("src", this.videoContainer.getAttribute("data-subId"));
                videoTrackNode.setAttribute("kind", "subtitles");
                videoTrackNode.setAttribute("srclang", "en");
                videoTrackNode.setAttribute("label", "English");
                videoNode.appendChild(videoTrackNode);
                this.platformPlayer = platformPlayerDiv.appendChild(videoNode);
                this.platformPlayer.addEventListener("loadedmetadata", this.onPlatformPlayerReady.bind(this));
                this.platformPlayer.addEventListener("ratechange", this.onDirectPlayerPlaybackRateChange.bind(this));
                this.platformPlayer.addEventListener("play", this.onDirectPlayerStateChange_Playing.bind(this));
                this.platformPlayer.addEventListener("pause", this.onDirectPlayerStateChange_Paused.bind(this));
                this.platformPlayer.addEventListener("waiting", this.onStateBufferStart.bind(this));
                this.platformPlayer.addEventListener("playing", this.onStateBufferEnd.bind(this));
                this.platformPlayer.addEventListener("ended", this.onStateEnded.bind(this));
            } break;
        case vod_platform.VIMEO:
            {
                this.videoContainer.style.position = "relative";
                if(!CineraProps.IsMobile)
                {
                    this.videoContainer.style.alignSelf = "unset";
                }

                var CallData = {
                    id: this.videoContainer.getAttribute("data-videoId"),
                    title: false,
                };
                var CCLang = this.videoContainer.getAttribute("data-ccLang");
                if(CCLang != null)
                {
                    CallData.texttrack = CCLang;
                }

                this.platformPlayer = new Vimeo.Player(platformPlayerDiv.id, CallData);

                this.platformPlayer.ready()
                    .then(this.onPlatformPlayerReady.bind(this));
                this.platformPlayer.on("playbackratechange", this.onVimeoPlayerPlaybackRateChange.bind(this));
                this.platformPlayer.on("play", this.onVimeoPlayerStateChange_Playing.bind(this));
                this.platformPlayer.on("pause", this.onVimeoPlayerStateChange_Paused.bind(this));
                this.platformPlayer.on("bufferstart", this.onStateBufferStart.bind());
                this.platformPlayer.on("bufferend", this.onStateBufferEnd.bind());
                this.platformPlayer.on("ended", this.onStateEnded.bind());
            } break;
        case vod_platform.YOUTUBE:
            {
                var CallData = {
                    videoId: this.videoContainer.getAttribute("data-videoId"),
                    width: this.videoContainer.offsetWidth,
                    height: this.videoContainer.offsetWidth / 16 * 9,
                    playerVars: { 'playsinline': 1 },
                    events: {
                        "onReady": this.onPlatformPlayerReady.bind(this),
                        "onStateChange": this.onYouTubePlayerStateChange.bind(this),
                        "onPlaybackRateChange": this.onYouTubePlayerPlaybackRateChange.bind(this)
                    }
                };
                var CCLang = this.videoContainer.getAttribute("data-ccLang");
                if(CCLang != null)
                {
                    CallData.cc_lang_pref = CCLang;
                    CallData.cc_load_policy = 1;
                }

                this.platformPlayer = new YT.Player(platformPlayerDiv.id, CallData);
            } break;
    }
};

Player.platformPlayerCount = 0;

Player.prototype.toggleFilterMode = function() {
    if(this.filterMode == "inclusive")
    {
        this.filterModeElement.classList.remove("inclusive");
        this.filterModeElement.classList.add("exclusive");
        this.filterMode = "exclusive";
    }
    else
    {
        this.filterModeElement.classList.remove("exclusive");
        this.filterModeElement.classList.add("inclusive");
        this.filterMode = "inclusive";
    }
    this.applyFilter();
}

Player.prototype.updateLink = function()
{
    if(this.link)
    {
        if(this.linkTimestamp == true)
        {
            if(this.currentMarker)
            {
                this.link.value = baseURL + "#" + this.currentMarker.timestamp;
            }
            else
            {
                this.link.value = baseURL;
            }
        }
        else
        {
            switch(this.vod_platform)
            {
                case vod_platform.DIRECT:
                    {
                        this.link.value = baseURL + "#" + Math.round(this.platformPlayer.currentTime);
                    } break;
                case vod_platform.VIMEO:
                    {
                        var Parent = this;
                        this.platformPlayer.getCurrentTime()
                            .then(function(Response)
                                {
                                    Parent.link.value = baseURL + "#" + Math.round(Response);
                                });
                    } break;
                case vod_platform.YOUTUBE:
                    {
                        this.link.value = baseURL + "#" + Math.round(this.platformPlayer.getCurrentTime());
                    } break;
            }
        }
    }
}

Player.prototype.toggleLinkMode = function()
{
    this.linkTimestamp = !this.linkTimestamp;
    if(this.linkTimestamp == true)
    {
        this.linkMode.textContent = "Link to: current timestamp";
    }
    else
    {
        this.linkMode.textContent = "Link to: nearest second";
    }
    this.updateLink();
}

Player.prototype.toggleFilterOrLinkMode = function()
{
    switch(this.MenusFocused.MenuID)
    {
        case menu_id.FILTER:
            {
                this.toggleFilterMode();
            } break;
        case menu_id.LINK:
            {
                this.toggleLinkMode();
            } break;
    }
}

function HideMenu(MenuContainer)
{
    if(MenuContainer != null)
    {
        MenuContainer.classList.remove("visible");
        MenuContainer.parentNode.classList.remove("visible");
    }
}

function ShowMenu(MenuContainer)
{
    if(MenuContainer != null)
    {
        MenuContainer.classList.add("visible");
        MenuContainer.parentNode.classList.add("visible");
    }
}

Player.prototype.toggleMenuVisibility = function(MenuID, Trigger) {
    var element = this.Menus[MenuID].Container;
    if(this.MenusFocused.Item)
    {
        this.unfocusUIElement(focus_level.ITEM);
    }
    if(this.MenusFocused.Identifier)
    {
        this.unfocusUIElement(focus_level.IDENTIFIER);
    }

    if(element.classList.contains("visible"))
    {
        HideMenu(element);
        this.MenusFocused.MenuID = menu_id.UNSET;

        if(Trigger == trigger_id.KEYBOARD && this.Menus[menu_id.MARKERS].Item.LastFocused)
        {
            var Best = this.Menus[menu_id.MARKERS].Item.LastFocused;
            while(Best.classList.contains("skip") && Best.nextElementSibling)
            {
                Best = Best.nextElementSibling;
            }

            if(!Best.classList.contains("skip"))
            {
                this.focusUIElement(focus_level.ITEM, menu_id.MARKERS, this.Menus[menu_id.MARKERS].Item, Best);
                this.setScroller(this.Menus[menu_id.MARKERS], this.MenusFocused.Item, true, false);
            }
        }
    }
    else
    {
        this.MenusFocused.MenuID = MenuID;
        for(var i in this.Menus)
        {
            HideMenu(this.Menus[i].Container);
        }
        ShowMenu(element);

        switch(MenuID)
        {
            case menu_id.QUOTES:
                {
                    if(!this.Menus[menu_id.QUOTES].Item.LastFocused || !this.Menus[menu_id.QUOTES].Identifier.LastFocused)
                    {
                        this.Menus[menu_id.QUOTES].Item.LastFocused = element.querySelector(".ref");
                        this.Menus[menu_id.QUOTES].Identifier.LastFocused = this.Menus[menu_id.QUOTES].Item.LastFocused.querySelector(".ref_indices").firstElementChild;
                    }
                    this.focusUIElement(focus_level.ITEM, menu_id.QUOTES, this.Menus[menu_id.QUOTES].Item, this.Menus[menu_id.QUOTES].Item.LastFocused);
                    this.focusUIElement(focus_level.IDENTIFIER, menu_id.QUOTES, this.Menus[menu_id.QUOTES].Identifier, this.Menus[menu_id.QUOTES].Identifier.LastFocused);
                } break;
            case menu_id.REFERENCES:
                {
                    if(!this.Menus[menu_id.REFERENCES].Item.LastFocused || !this.Menus[menu_id.REFERENCES].Identifier.LastFocused)
                    {
                        this.Menus[menu_id.REFERENCES].Item.LastFocused = element.querySelector(".ref");
                        this.Menus[menu_id.REFERENCES].Identifier.LastFocused = this.Menus[menu_id.REFERENCES].Item.LastFocused.querySelector(".ref_indices").firstElementChild;
                    }
                    this.focusUIElement(focus_level.ITEM, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Item, this.Menus[menu_id.REFERENCES].Item.LastFocused);
                    this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, this.Menus[menu_id.REFERENCES].Identifier.LastFocused);
                } break;
            case menu_id.FILTER:
                {
                    if(!this.Menus[menu_id.FILTER].Category.LastFocused)
                    {
                        this.Menus[menu_id.FILTER].Category.LastFocused = element.querySelector(".filter_content");
                    }
                    this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.Menus[menu_id.FILTER].Category.LastFocused);
                } break;
            case menu_id.CREDITS:
                {
                    if(!this.Menus[menu_id.CREDITS].Item.LastFocused)
                    {
                        if(element.querySelector(".credit .person").nextElementSibling)
                        {
                            this.Menus[menu_id.CREDITS].Item.LastFocused = element.querySelector(".credit .support");
                        }
                        else
                        {
                            this.Menus[menu_id.CREDITS].Item.LastFocused = element.querySelector(".credit .person");
                        }
                    }
                    this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.Menus[menu_id.CREDITS].Item.LastFocused);
                } break;
        }
    }
}

Player.prototype.handleMouseOverViewsMenu = function()
{
    switch(CineraProps.V)
    {
        case views.REGULAR:
        case views.THEATRE:
            {
                this.Menus[menu_id.VIEWS].Container.classList.add("visible");
            } break;
        case views.SUPERTHEATRE:
            {
            } break;
    }
    this.MenusFocused.MenuID = menu_id.VIEWS;
}

function IsFullScreen()
{
    return (document.fullscreen || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
}

function enterFullScreen_()
{
    if(!IsFullScreen())
    {
        if(document.body.requestFullscreen) { document.body.requestFullscreen(); }
        else if(document.body.mozRequestFullScreen) { document.body.mozRequestFullScreen(); }
        else if(document.body.webkitRequestFullScreen) { document.body.webkitRequestFullScreen(); }
        else if(document.body.msRequestFullscreen) { document.body.msRequestFullscreen(); }
    }
}

function leaveFullScreen_()
{
    if(IsFullScreen())
    {
        if(document.exitFullscreen) { document.exitFullscreen(); }
        else if(document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
        else if(document.webkitCancelFullScreen) { document.webkitCancelFullScreen(); }
        else if(document.msExitFullscreen) { document.msExitFullscreen(); }
    }
}

Player.prototype.toggleTheatreMode = function() {
    if(!CineraProps.IsMobile)
    {
        switch(CineraProps.V)
        {
            case views.REGULAR:
                {
                    CineraProps.C = this.root.style.backgroundColor;
                    CineraProps.Z = this.root.style.zIndex;
                    CineraProps.X = this.root.style.left;
                    CineraProps.Y = this.root.style.top;
                    CineraProps.W = this.root.style.width;
                    CineraProps.mW = this.root.style.maxWidth;
                    CineraProps.H = this.root.style.height;
                    CineraProps.mH = this.root.style.maxHeight;
                    CineraProps.P = this.root.style.position;
                    CineraProps.Display = this.root.style.display;
                    CineraProps.FlexDirection = this.root.style.flexDirection;
                    CineraProps.JustifyContent = this.root.style.justifyContent;
                    CineraProps.ScrollX = window.scrollX;
                    CineraProps.ScrollY = window.scrollY;

                    this.root.style.backgroundColor = "#000";
                    this.root.style.zIndex = 64;
                    this.root.style.left = 0;
                    this.root.style.top = 0;
                    this.root.style.width = "100%";
                    this.root.style.maxWidth = "100%";
                    this.root.style.height = "100%";
                    this.root.style.maxHeight = "100%";
                    this.root.style.position = "fixed";
                    this.root.style.display = "flex";
                    this.root.style.flexDirection = "column";
                    this.root.style.justifyContent = "center";

                    this.viewItems[0].setAttribute("data-id", "regular");
                    this.viewItems[0].setAttribute("title", "Regular mode");
                    this.viewItems[0].firstChild.nodeValue = "📺";
                } CineraProps.V = views.THEATRE; localStorage.setItem(this.cineraViewStorageItem, views.THEATRE); break;
            case views.SUPERTHEATRE:
                {
                    leaveFullScreen_();
                }
            case views.THEATRE:
                {
                    this.root.style.backgroundColor = CineraProps.C;
                    this.root.style.zIndex = CineraProps.Z;
                    this.root.style.left = CineraProps.X;
                    this.root.style.top = CineraProps.Y;
                    this.root.style.width = CineraProps.W;
                    this.root.style.maxWidth = CineraProps.mW;
                    this.root.style.height = CineraProps.H;
                    this.root.style.maxHeight = CineraProps.mH;
                    this.root.style.position = CineraProps.P;
                    this.root.style.display = CineraProps.Display;
                    this.root.style.flexDirection = CineraProps.FlexDirection;
                    this.root.style.justifyContent = CineraProps.JustifyContent;
                    window.scroll(
                        {
                            top: CineraProps.ScrollY,
                            left: CineraProps.ScrollX
                        }
                    );

                    this.viewItems[0].setAttribute("data-id", "theatre");
                    this.viewItems[0].setAttribute("title", "Theatre mode");
                    this.viewItems[0].firstChild.nodeValue = "🎭";
                } CineraProps.V = views.REGULAR; localStorage.removeItem(this.cineraViewStorageItem); break;
        }
        this.updateSize();
    }
}

Player.prototype.toggleSuperTheatreMode = function()
{
    if(!CineraProps.IsMobile)
    {
        switch(CineraProps.V)
        {
            case views.REGULAR:
                {
                    this.toggleTheatreMode();
                }
            case views.THEATRE:
                {
                    enterFullScreen_();
                } CineraProps.V = views.SUPERTHEATRE; localStorage.setItem(this.cineraViewStorageItem, views.SUPERTHEATRE); break;
            case views.SUPERTHEATRE:
                {
                    leaveFullScreen_();
                    this.toggleTheatreMode();
                } CineraProps.V = views.REGULAR; localStorage.removeItem(this.cineraViewStorageItem); break;
        }
        this.updateSize();
    }
}

function AscribeTemporaryResponsibility(Element, Milliseconds)
{
    if(!Element.classList.contains("responsible"))
    {
        Element.classList.add("responsible");
    }
    setTimeout(function() { Element.classList.remove("responsible"); }, Milliseconds);
}

function SelectText(inputElement)
{
    inputElement.select();
}

Player.prototype.CopyToClipboard = function(inputElement)
{
    SelectText(inputElement);
    document.execCommand("copy");
    AscribeTemporaryResponsibility(this.Menus[menu_id.LINK].Container.parentNode, 8000);
}

Player.prototype.unfocusUIElement = function(FocusLevel)
{
    switch(FocusLevel)
    {
        case focus_level.ITEM:
            {
                if(this.MenusFocused.Item)
                {
                    this.MenusFocused.Item.classList.remove("focused");
                    unfocusSprite(this.MenusFocused.Item);
                }
                this.MenusFocused.Item = null;
            } break;
        case focus_level.IDENTIFIER:
            {
                if(this.MenusFocused.Identifier)
                {
                    this.MenusFocused.Identifier.classList.remove("focused");
                    unfocusSprite(this.MenusFocused.Identifier);
                }
                this.MenusFocused.Identifier = null;
            } break;
    }
    this.MenusFocused.MenuID = menu_id.UNSET;
}

Player.prototype.focusUIElement = function(FocusLevel, MenuID, MenuFocalPoint, newElement)
{
    switch(FocusLevel)
    {
        case focus_level.ITEM:
            {
                if(this.MenusFocused.Item)
                {
                    this.MenusFocused.Item.classList.remove("focused");
                    unfocusSprite(this.MenusFocused.Item);
                }
                this.MenusFocused.Item = newElement;
            } break;
        case focus_level.IDENTIFIER:
            {
                if(this.MenusFocused.Identifier)
                {
                    this.MenusFocused.Identifier.classList.remove("focused");
                    unfocusSprite(this.MenusFocused.Identifier);
                }
                this.MenusFocused.Identifier = newElement;
            } break;
    }
    this.MenusFocused.MenuID = MenuID;

    newElement.classList.add("focused");
    focusSprite(newElement);
    MenuFocalPoint.LastFocused = newElement;
}

function
getMostRecentCitation(currentTime, citations)
{
    var Result = citations[0];
    for(var i = 0; i < citations.length; ++i)
    {
        var citation = citations[i];
        if(citation.getAttribute("data-timestamp") <= currentTime)
        {
            Result = citation;
        }
        else { break; }
    }
    return Result;
}

Player.prototype.handleKey = function(key) {
    var gotKey = true;
    switch (key) {
        case "Escape": {
            switch(this.MenusFocused.MenuID)
            {
                case menu_id.MARKERS:
                    {
                        this.unfocusUIElement(focus_level.ITEM);
                        if(this.currentMarker && this.currentMarker.el)
                        {
                            this.setScroller(this.Menus[menu_id.MARKERS], this.currentMarker.el, true, false);
                        }
                        this.Menus[menu_id.MARKERS].Item.LastFocused = null;
                    } break;
                case menu_id.QUOTES:
                case menu_id.REFERENCES:
                case menu_id.FILTER:
                case menu_id.VIEWS:
                case menu_id.LINK:
                case menu_id.CREDITS:
                    {
                        this.toggleMenuVisibility(this.MenusFocused.MenuID, trigger_id.KEYBOARD);
                    } break;
            }
        } break;
        case "q": {
            if(this.Menus[menu_id.QUOTES].Container)
            {
                this.toggleMenuVisibility(menu_id.QUOTES, trigger_id.KEYBOARD);
            }
        } break;
        case "r": {
            if(this.Menus[menu_id.REFERENCES].Container)
            {
                this.toggleMenuVisibility(menu_id.REFERENCES, trigger_id.KEYBOARD);
            }
        } break;
        case "f": {
            if(this.Menus[menu_id.FILTER].Container)
            {
                this.toggleMenuVisibility(menu_id.FILTER, trigger_id.KEYBOARD);
            }
        } break;
        case "y": {
            if(this.Menus[menu_id.LINK].Container)
            {
                this.toggleMenuVisibility(menu_id.LINK, trigger_id.KEYBOARD);
            }
            break;
        }
        case "c": {
            if(this.Menus[menu_id.CREDITS].Container)
            {
                this.toggleMenuVisibility(menu_id.CREDITS, trigger_id.KEYBOARD);
            }
        } break;
        case "t": {
            if(this.root)
            {
                this.toggleTheatreMode();
            }
        } break;
        case "T": {
            if(this.root)
            {
                this.toggleSuperTheatreMode();
            }
        } break;

        case "Enter": {
            if(this.MenusFocused.Item)
            {
                switch(this.MenusFocused.MenuID)
                {
                    case menu_id.MARKERS:
                        {
                            var time = this.MenusFocused.Item.getAttribute("data-timestamp");
                            this.setTimeThenPlay(parseFloat(time));
                        } break;
                    case menu_id.QUOTES:
                        {
                            var time = this.MenusFocused.Item.querySelector(".timecode").getAttribute("data-timestamp");
                            this.setTimeThenPlay(parseFloat(time));
                            if(this.currentMarker)
                            {
                                this.setScroller(this.Menus[menu_id.MARKERS], this.currentMarker.el, true, false);
                            }
                            this.Menus[menu_id.MARKERS].Item.LastFocused = null;
                        } break;
                    case menu_id.REFERENCES:
                        {
                            var time = this.MenusFocused.Identifier.getAttribute("data-timestamp");
                            this.setTimeThenPlay(parseFloat(time));
                            if(this.currentMarker)
                            {
                                this.setScroller(this.Menus[menu_id.MARKERS], this.currentMarker.el, true, false);
                            }
                            this.Menus[menu_id.MARKERS].Item.LastFocused = null;
                        } break;
                    case menu_id.CREDITS:
                        {
                            if(this.MenusFocused.Item.hasAttribute)
                            {
                                var url = this.MenusFocused.Item.getAttribute("href");
                                if(url) { window.open(url, "_blank"); }
                            }
                        } break;
                }
            }
            else
            {
                if(this.currentMarker && this.currentMarker.el)
                {
                    var time = this.currentMarker.el.getAttribute("data-timestamp");
                    this.setTimeThenPlay(parseFloat(time));
                    this.setScroller(this.Menus[menu_id.MARKERS], this.currentMarker.el, true, false);
                }
            }
        } break;

        case "o": {
            if(this.MenusFocused.Item)
            {
                switch(this.MenusFocused.MenuID)
                {
                    case menu_id.REFERENCES:
                    case menu_id.QUOTES:
                        {
                            this.pause();
                            var url = this.MenusFocused.Item.getAttribute("href");
                            window.open(url, "_blank");
                        } break;
                    case menu_id.CREDITS:
                        {
                            if(this.MenusFocused.Item.hasAttribute("href"))
                            {
                                this.pause();
                                var url = this.MenusFocused.Item.getAttribute("href");
                                window.open(url, "_blank");
                            }
                        } break;
                }
            }
        } break;

        case "w": case "k": case "ArrowUp": {
            if(this.MenusFocused.Item)
            {
                switch(this.MenusFocused.MenuID)
                {
                    case menu_id.MARKERS:
                        {
                            if(key != "ArrowUp")
                            {
                                if(this.MenusFocused.Item.previousElementSibling)
                                {
                                    var Best = this.MenusFocused.Item.previousElementSibling;
                                    while(Best.classList.contains("skip") && Best.previousElementSibling)
                                    {
                                        Best = Best.previousElementSibling;
                                    }

                                    if(!Best.classList.contains("skip"))
                                    {
                                        this.focusUIElement(focus_level.ITEM, menu_id.MARKERS, this.Menus[menu_id.MARKERS].Item, Best);

                                        this.setScroller(this.Menus[menu_id.MARKERS], this.MenusFocused.Item, true, false);
                                    }
                                }
                            }
                        } break;
                    case menu_id.QUOTES:
                        {
                            if(this.MenusFocused.Item.previousElementSibling)
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.QUOTES, this.Menus[menu_id.QUOTES].Item, this.MenusFocused.Item.previousElementSibling);
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.QUOTES, this.Menus[menu_id.QUOTES].Identifier, this.MenusFocused.Item.querySelector(".ref_indices").firstElementChild);

                                this.setScroller(this.Menus[menu_id.QUOTES], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.REFERENCES:
                        {
                            if(this.MenusFocused.Item.previousElementSibling)
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Item, this.MenusFocused.Item.previousElementSibling);
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, getMostRecentCitation(this.currentTime, this.MenusFocused.Item.querySelector(".ref_indices").children));

                                this.setScroller(this.Menus[menu_id.REFERENCES], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.FILTER:
                        {
                            if(this.MenusFocused.Item.previousElementSibling &&
                                this.MenusFocused.Item.previousElementSibling.classList.contains("filter_content"))
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.MenusFocused.Item.previousElementSibling);

                                this.setScroller(this.Menus[menu_id.FILTER], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.CREDITS:
                        {
                            if(this.MenusFocused.Item.parentNode.previousElementSibling)
                            {
                                if(this.MenusFocused.Item.parentNode.previousElementSibling.querySelector(".support") &&
                                    this.MenusFocused.Item.classList.contains("support"))
                                {
                                    this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.MenusFocused.Item.parentNode.previousElementSibling.querySelector(".support"));
                                }
                                else
                                {
                                    this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.MenusFocused.Item.parentNode.previousElementSibling.querySelector(".person"));
                                }

                                this.setScroller(this.Menus[menu_id.CREDITS], this.MenusFocused.Item, true, false);
                            }
                        } break;
                }
            }
            else
            {
                if(key != "ArrowUp")
                {
                    var Best;
                    if(this.currentMarker && this.currentMarker.el)
                    {
                        Best = this.currentMarker.el;
                        if(Best.previousElementSibling)
                        {
                            Best = Best.previousElementSibling;
                            while(Best.classList.contains("skip") && Best.previousElementSibling)
                            {
                                Best = Best.previousElementSibling;
                            }
                        }
                    }
                    else
                    {
                        Best = this.markers[0].el;
                        while(Best.classList.contains("skip") && Best.nextElementSibling)
                        {
                            Best = Best.nextElementSibling;
                        }
                    }

                    if(!Best.classList.contains("skip"))
                    {
                        this.focusUIElement(focus_level.ITEM, menu_id.MARKERS, this.Menus[menu_id.MARKERS].Item, Best);

                        this.setScroller(this.Menus[menu_id.MARKERS], this.MenusFocused.Item, true, false);
                    }
                }
            }
        } break;

        case "s": case "j": case "ArrowDown": {
            if(this.MenusFocused.Item)
            {
                switch(this.MenusFocused.MenuID)
                {
                    case menu_id.MARKERS:
                        {
                            if(key != "ArrowDown")
                            {
                                if(this.MenusFocused.Item.nextElementSibling)
                                {
                                    var Best = this.MenusFocused.Item.nextElementSibling;
                                    while(Best.classList.contains("skip") && Best.nextElementSibling)
                                    {
                                        Best = Best.nextElementSibling;
                                    }

                                    if(!Best.classList.contains("skip"))
                                    {
                                        this.focusUIElement(focus_level.ITEM, menu_id.MARKERS, this.Menus[menu_id.MARKERS].Item, Best);

                                        this.setScroller(this.Menus[menu_id.MARKERS], this.MenusFocused.Item, true, false);
                                    }
                                }
                            }
                        } break;
                    case menu_id.QUOTES:
                        {
                            if(this.MenusFocused.Item.nextElementSibling)
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.QUOTES, this.Menus[menu_id.QUOTES].Item, this.MenusFocused.Item.nextElementSibling);
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.QUOTES, this.Menus[menu_id.QUOTES].Identifier, this.MenusFocused.Item.querySelector(".ref_indices").firstElementChild);

                                this.setScroller(this.Menus[menu_id.QUOTES], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.REFERENCES:
                        {
                            if(this.MenusFocused.Item.nextElementSibling)
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Item, this.MenusFocused.Item.nextElementSibling);
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, getMostRecentCitation(this.currentTime, this.MenusFocused.Item.querySelector(".ref_indices").children));

                                this.setScroller(this.Menus[menu_id.REFERENCES], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.FILTER:
                        {
                            if(this.MenusFocused.Item.nextElementSibling &&
                                this.MenusFocused.Item.nextElementSibling.classList.contains("filter_content"))
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.MenusFocused.Item.nextElementSibling);

                                this.setScroller(this.Menus[menu_id.FILTER], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.CREDITS:
                        {
                            if(this.MenusFocused.Item.parentNode.nextElementSibling)
                            {
                                if(this.MenusFocused.Item.parentNode.nextElementSibling.querySelector(".support") &&
                                    this.MenusFocused.Item.classList.contains("support"))
                                {
                                    this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.MenusFocused.Item.parentNode.nextElementSibling.querySelector(".support"));
                                }
                                else
                                {
                                    this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.MenusFocused.Item.parentNode.nextElementSibling.querySelector(".person"));
                                }

                                this.setScroller(this.Menus[menu_id.CREDITS], this.MenusFocused.Item, true, false);
                            }
                        } break;
                }
            }
            else
            {
                if(key != "ArrowDown")
                {
                    var Best;
                    if(this.currentMarker && this.currentMarker.el)
                    {
                        Best = this.currentMarker.el;
                        if(Best.nextElementSibling)
                        {
                            Best = Best.nextElementSibling;
                            while(Best.classList.contains("skip") && Best.nextElementSibling)
                            {
                                Best = Best.nextElementSibling;
                            }
                        }
                    }
                    else
                    {
                        Best = this.markers[0].el;
                        while(Best.classList.contains("skip") && Best.nextElementSibling)
                        {
                            Best = Best.nextElementSibling;
                        }
                    }

                    if(!Best.classList.contains("skip"))
                    {
                        this.focusUIElement(focus_level.ITEM, menu_id.MARKERS, this.Menus[menu_id.MARKERS].Item, Best);

                        this.setScroller(this.Menus[menu_id.MARKERS], this.MenusFocused.Item, true, false);
                    }
                }
            }
        } break;

        case "a": case "h": case "ArrowLeft": {
            if(this.MenusFocused.Item)
            {
                switch(this.MenusFocused.MenuID)
                {
                    case menu_id.REFERENCES:
                        {
                            if(this.MenusFocused.Identifier.previousElementSibling)
                            {
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, this.MenusFocused.Identifier.previousElementSibling);
                            }
                            else if(this.MenusFocused.Identifier.parentNode.previousElementSibling.classList.contains("ref_indices"))
                            {
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, this.MenusFocused.Identifier.parentNode.previousElementSibling.lastElementChild);
                            }
                        } break;
                    case menu_id.FILTER:
                        {
                            if(this.MenusFocused.Item.parentNode.classList.contains("filter_media") &&
                                this.MenusFocused.Item.parentNode.previousElementSibling)
                            {
                                this.Menus[menu_id.FILTER].Medium.LastFocused = this.MenusFocused.Item;
                                this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.Menus[menu_id.FILTER].Topic.LastFocused || this.MenusFocused.Item.parentNode.previousElementSibling.children[0]);

                                this.setScroller(this.Menus[menu_id.FILTER], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.CREDITS:
                        {
                            if(this.MenusFocused.Item.classList.contains("support"))
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.MenusFocused.Item.previousElementSibling);
                            }
                        } break;
                }
            }
        } break;

        case "d": case "l": case "ArrowRight": {
            if(this.MenusFocused.Item)
            {
                switch(this.MenusFocused.MenuID)
                {
                    case menu_id.REFERENCES:
                        {
                            if(this.MenusFocused.Identifier.nextElementSibling)
                            {
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, this.MenusFocused.Identifier.nextElementSibling);
                            }
                            else if(this.MenusFocused.Identifier.parentNode.nextElementSibling)
                            {
                                this.focusUIElement(focus_level.IDENTIFIER, menu_id.REFERENCES, this.Menus[menu_id.REFERENCES].Identifier, this.MenusFocused.Identifier.parentNode.nextElementSibling.firstElementChild);
                            }
                        } break;
                    case menu_id.FILTER:
                        {
                            if(this.MenusFocused.Item.parentNode.classList.contains("filter_topics") &&
                                this.MenusFocused.Item.parentNode.nextElementSibling)
                            {
                                this.Menus[menu_id.FILTER].Topic.LastFocused = this.MenusFocused.Item;
                                this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.Menus[menu_id.FILTER].Medium.LastFocused || this.MenusFocused.Item.parentNode.nextElementSibling.children[0]);

                                this.setScroller(this.Menus[menu_id.FILTER], this.MenusFocused.Item, true, false);
                            }
                        } break;
                    case menu_id.CREDITS:
                        {
                            if(this.MenusFocused.Item.classList.contains("person") &&
                                this.MenusFocused.Item.nextElementSibling)
                            {
                                this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, this.MenusFocused.Item.nextElementSibling);
                            }
                        } break;
                }
            }
        } break;

        case "x": case " ": {
            if(this.MenusFocused.Item && this.MenusFocused.MenuID == menu_id.FILTER)
            {
                this.filterItemToggle(this.MenusFocused.Item);
                if(this.MenusFocused.Item.nextElementSibling &&
                    this.MenusFocused.Item.nextElementSibling.classList.contains("filter_content"))
                {
                    this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.MenusFocused.Item.nextElementSibling);

                    this.setScroller(this.Menus[menu_id.FILTER], this.MenusFocused.Item, true, false);
                    if(this.MenusFocused.Item.parentNode.classList.contains("filter_topics"))
                    {
                        this.Menus[menu_id.FILTER].Topic.LastFocused = this.MenusFocused.Item;
                    }
                    else
                    {
                        this.Menus[menu_id.FILTER].Medium.LastFocused = this.MenusFocused.Item;
                    }
                }
            }
        } break;

        case "X": case "capitalSpace": {
            if(this.MenusFocused.Item && this.MenusFocused.MenuID == menu_id.FILTER)
            {
                this.filterItemToggle(this.MenusFocused.Item);
                if(this.MenusFocused.Item.previousElementSibling &&
                    this.MenusFocused.Item.previousElementSibling.classList.contains("filter_content"))
                {
                    this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, this.MenusFocused.Item.previousElementSibling);

                    this.setScroller(this.Menus[menu_id.FILTER], this.MenusFocused.Item, true, false);
                    if(this.MenusFocused.Item.parentNode.classList.contains("filter_topics"))
                    {
                        this.Menus[menu_id.FILTER].Topic.LastFocused = this.MenusFocused.Item;
                    }
                    else
                    {
                        this.Menus[menu_id.FILTER].Medium.LastFocused = this.MenusFocused.Item;
                    }
                }
            }
        } break;

        case "z": {
            this.toggleFilterOrLinkMode();
        } break;

        case "v": {
            if(this.MenusFocused.Item && this.MenusFocused.MenuID == menu_id.FILTER)
            {
                this.invertFilter(this.MenusFocused.Item)
            }
        } break;

        case "V": {
            this.resetFilter();
        } break;

        case "?": {
            if(this.helpDocumentation)
            {
                this.helpDocumentation.classList.toggle("visible");
            }
        } break;

        case 'N':
        case 'J':
        case 'S': {
            this.jumpToNextMarker();
        } break;

        case 'P':
        case 'K':
        case 'W': {
            this.jumpToPrevMarker();
        } break;
        case '[':
        case '<': {
            if(this.prevEpisode)
            {
                location = this.prevEpisode.href;
            }
        } break;
        case ']':
        case '>': {
            if(this.nextEpisode)
            {
                location = this.nextEpisode.href;
            }
        } break;
        case 'Y': {
            if(cineraLink)
            {
                if(this.linkTimestamp == false && this.playing)
                {
                    this.pause();
                }
                if(this.Menus[menu_id.LINK].Container && !this.Menus[menu_id.LINK].Container.classList.contains("visible"))
                {
                    this.toggleMenuVisibility(menu_id.LINK, trigger_id.KEYBOARD);
                }
                SelectText(cineraLink);
            }
        }
        default: {
            gotKey = false;
        } break;
    }
    return gotKey;
}

Player.prototype.applyFilter = function() {
    if(this.filterMode == "exclusive")
    {
        for(var i = 0; i < this.Menus[menu_id.MARKERS].Elements.length; ++i)
        {
            var Item = this.Menus[menu_id.MARKERS].Elements[i];
            var testCategories = Item.classList;
            for(var j = 0; j < testCategories.length; ++j)
            {
                if((testCategories[j].startsWith("off_")) && !Item.classList.contains("skip"))
                {
                    Item.classList.add("skip");
                }
            }
        }
    }
    else
    {
        for(var i = 0; i < this.Menus[menu_id.MARKERS].Elements.length; ++i)
        {
            var Item = this.Menus[menu_id.MARKERS].Elements[i];
            var testCategories = Item.classList;
            for(var j = 0; j < testCategories.length; ++j)
            {
                var testCategory = testCategories[j];
                if((testCategory in this.filterState || testCategory.startsWith("cat_")) && Item.classList.contains("skip"))
                {
                    Item.classList.remove("skip");
                }
            }
        }
    }
}

Player.prototype.filterItemToggle = function(filterItem) {
    var selectedCategory = filterItem.classList[1];
    this.filterState[selectedCategory].off = !this.filterState[selectedCategory].off;

    if(this.filterState[selectedCategory].off)
    {
        filterItem.classList.add("off");
        disableSprite(filterItem);
        if(!filterItem.parentNode.classList.contains("filter_media"))
        {
            filterItem.querySelector(".icon").style.backgroundColor = "transparent";
        }
        var testMarkers = this.Menus[menu_id.MARKERS].Container.querySelectorAll(".marker." + selectedCategory + ", .marker.cat_" + selectedCategory);
        for(var i = 0; i < testMarkers.length; ++i)
        {
            var testMarker = testMarkers[i];
            if(this.filterState[selectedCategory].type == "topic")
            {
                testMarker.classList.remove("cat_" + selectedCategory);
                testMarker.classList.add("off_" + selectedCategory);
                var markerCategories = testMarker.querySelectorAll(".category." + selectedCategory);
                for(var j = 0; j < markerCategories.length; ++j)
                {
                    var markerCategory = markerCategories[j];
                    if(markerCategory.classList.contains(selectedCategory))
                    {
                        markerCategory.classList.add("off");
                        markerCategory.style.backgroundColor = "transparent";
                    }
                }
            }
            else
            {
                var markerCategories = testMarker.querySelectorAll(".categoryMedium." + selectedCategory);
                for(var j = 0; j < markerCategories.length; ++j)
                {
                    var markerCategory = markerCategories[j];
                    if(markerCategory.classList.contains(selectedCategory))
                    {
                        markerCategory.classList.add("off");
                        disableSprite(markerCategory);
                    }
                }
                testMarker.classList.remove(selectedCategory);
                testMarker.classList.add("off_" + selectedCategory);
            }

            var Skipping = true;
            if(this.filterMode == "exclusive")
            {
                testMarker.classList.add("skip");
            }
            else
            {
                var markerClasses = testMarker.classList;
                for(var j = 0; j < markerClasses.length; ++j)
                {
                    var markerClass = markerClasses[j];
                    if(markerClass in this.filterState || markerClass.replace(/^cat_/, "") in this.filterState)
                    {
                        Skipping = false;
                    }
                }
                if(Skipping)
                {
                    testMarker.classList.add("skip");
                }
            }
        }
    }
    else
    {
        filterItem.classList.remove("off");
        enableSprite(filterItem);
        if(!filterItem.parentNode.classList.contains("filter_media"))
        {
            filterItem.querySelector(".icon").style.backgroundColor = getComputedStyle(filterItem.querySelector(".icon")).getPropertyValue("border-color");
        }
        setDotLightness(filterItem.querySelector(".icon"));
        var testMarkers = this.Menus[menu_id.MARKERS].Container.querySelectorAll(".marker.off_" + selectedCategory);
        for(var i = 0; i < testMarkers.length; ++i)
        {
            var testMarker = testMarkers[i];
            if(this.filterState[selectedCategory].type == "topic")
            {
                testMarker.classList.remove("off_" + selectedCategory);
                testMarker.classList.add("cat_" + selectedCategory);
                var markerCategories = testMarker.querySelectorAll(".category." + selectedCategory);
                for(var j = 0; j < markerCategories.length; ++j)
                {
                    var markerCategory = markerCategories[j];
                    if(markerCategory.classList.contains(selectedCategory))
                    {
                        markerCategory.classList.remove("off");
                        markerCategory.style.backgroundColor = getComputedStyle(markerCategory).getPropertyValue("border-color");
                        setDotLightness(markerCategory);
                    }
                }
            }
            else
            {
                testMarker.classList.remove("off_" + selectedCategory);
                testMarker.classList.add(selectedCategory);
                var markerCategories = testMarker.querySelectorAll(".categoryMedium." + selectedCategory);
                for(var j = 0; j < markerCategories.length; ++j)
                {
                    var markerCategory = markerCategories[j];
                    if(markerCategory.classList.contains(selectedCategory))
                    {
                        markerCategory.classList.remove("off");
                        enableSprite(markerCategory);
                    }
                }
            }

            var Skipping = false;
            if(this.filterMode == "inclusive")
            {
                testMarker.classList.remove("skip");
            }
            else
            {
                var markerClasses = testMarker.classList;
                for(var j = 0; j < markerClasses.length; ++j)
                {
                    if(markerClasses[j].startsWith("off_"))
                    {
                        Skipping = true;
                    }
                }
                if(!Skipping)
                {
                    testMarker.classList.remove("skip");
                }
            }
        }
    }
}

Player.prototype.resetFilter = function() {
    for(var i in this.Menus[menu_id.FILTER].Elements)
    {
        var Item = this.Menus[menu_id.FILTER].Elements[i];
        if(Item.classList)
        {
            var selectedCategory = Item.classList[1];
            if(this.filterInitState[selectedCategory].off ^ this.filterState[selectedCategory].off)
            {
                this.filterItemToggle(Item);
            }
        }
    }

    if(this.filterMode == "inclusive")
    {
        this.toggleFilterMode();
    }
}

Player.prototype.invertFilter = function(FocusedElement) {
    var siblings = player.MenusFocused.Item.parentNode.querySelectorAll(".filter_content");
    for(var i in siblings)
    {
        var sibling = siblings[i];
        if(sibling.classList)
        {
            this.filterItemToggle(sibling);
        }
    }
}

function resetFade(player) {
    player.filter.classList.remove("responsible");
    player.filter.querySelector(".filter_mode").classList.remove("responsible");
    var responsibleCategories = player.filter.querySelectorAll(".filter_content.responsible");
    for(var i = 0; i < responsibleCategories.length; ++i)
    {
        responsibleCategories[i].classList.remove("responsible");
    }
}

Player.prototype.alignMenuWithTimestamp = function(ref, element, MenuID)
{
    var MenuEntity = this.Menus[MenuID];
    var Container = MenuEntity.Container;
    if(Container)
    {
        var Toggler = Container.closest(".menu");

        var SetMenu = 0;
        if (ref !== undefined && ref !== null) {
            var refs = ref.split(",");

            var TargetTop = null;
            var TargetBottom = null;

            for (var i = 0; i < MenuEntity.Elements.length; ++i) {
                var thisRef = MenuEntity.Elements[i];
                if (refs.includes(thisRef.getAttribute("data-id"))) {
                    thisRef.classList.add("current");
                    if(!SetMenu)
                    {
                        if(this.MenusFocused.MenuID == MenuID)
                        {
                            this.focusUIElement(focus_level.ITEM, MenuID, MenuEntity.Item, thisRef);
                        }
                        else
                        {
                            MenuEntity.Item.LastFocused = thisRef;
                        }

                        TargetTop = thisRef;

                        var timecode = element.getAttribute("data-timestamp");

                        var ourIdentifiers = thisRef.querySelectorAll(".timecode");
                        for(var j = 0; j < ourIdentifiers.length; ++j)
                        {
                            var thisIdentifier = ourIdentifiers[j];
                            if(timecode == thisIdentifier.getAttribute("data-timestamp"))
                            {
                                if(this.MenusFocused.MenuID == MenuID)
                                {
                                    this.focusUIElement(focus_level.IDENTIFIER, MenuID, MenuEntity.Identifier, thisIdentifier);
                                }
                                else
                                {
                                    MenuEntity.Identifier.LastFocused = thisIdentifier;
                                }
                                break;
                            }
                        }
                    }
                    TargetBottom = thisRef;
                    SetMenu = 1;
                } else {
                    thisRef.classList.remove("current");
                }
            }
            if(SetMenu) {
                Toggler.classList.add("current");

                var CentreAlign = true;
                if(!Container.classList.contains("visible"))
                {
                    Container.scrollTop = this.computeDesiredScrollTo(MenuEntity, TargetTop, TargetBottom, CentreAlign);
                }
                else
                {
                    this.setScrollerRanged(MenuEntity, TargetTop, TargetBottom, CentreAlign, true);
                }
            } else {
                Toggler.classList.remove("current");
            }

        } else {
            Toggler.classList.remove("current");
            for (var i = 0; i < MenuEntity.Elements.length; ++i) {
                MenuEntity.Elements[i].classList.remove("current");
            }
        }
    }
}

function onRefChanged(ref, element, player) {
    if(element.classList.contains("skip"))
    {
        var ErrorCount = 0;
        if(!player.filter) { console.log("Missing filter_container div"); ErrorCount++; }
        if(!player.filterState) { console.log("Missing filterState object"); ErrorCount++; }
        if(ErrorCount > 0)
        {
            switch(ErrorCount)
            {
                case 1:
                    { console.log("This should have been generated by Cinera along with the following element containing the \"skip\" class:"); } break;
                default:
                    { console.log("These should have been generated by Cinera along with the following element containing the \"skip\" class:"); } break;
            }
            console.log(element); return;
        }

        if(!player.filter.classList.contains("responsible"))
        {
            player.filter.classList.add("responsible");
        }

        for(var selector = 0; selector < element.classList.length; ++selector)
        {
            var elementClass = element.classList[selector];
            if(elementClass.startsWith("off_"))
            {
                if(!player.filter.querySelector(".filter_content." + elementClass.replace(/^off_/, "")).classList.contains("responsible"))
                {
                    player.filter.querySelector(".filter_content." + elementClass.replace(/^off_/, "")).classList.add("responsible");
                }
            }
            if(elementClass.startsWith("cat_") || elementClass in player.filterState)
            {
                if(!player.filter.querySelector(".filter_mode").classList.add("responsible"))
                {
                    player.filter.querySelector(".filter_mode").classList.add("responsible");
                }
            }
            setTimeout(resetFade, 8000, player);
        }
        if(player && player.playing)
        {
            player.jumpToNextMarker();
        }
    }
    else
    {
        player.alignMenuWithTimestamp(ref, element, menu_id.QUOTES);
        player.alignMenuWithTimestamp(ref, element, menu_id.REFERENCES);
    }
}

Player.prototype.navigateFilter = function(filterItem) {
    if(filterItem != this.Menus[menu_id.FILTER].Category.LastFocused)
    {
        this.unfocusUIElement(focus_level.ITEM);
    }

    this.focusUIElement(focus_level.ITEM, menu_id.FILTER, this.Menus[menu_id.FILTER].Category, filterItem);
    if(filterItem.parentNode.classList.contains("filter_topics"))
    {
        this.Menus[menu_id.FILTER].Topic.LastFocused = this.Menus[menu_id.FILTER].Category.LastFocused;
    }
    else
    {
        this.Menus[menu_id.FILTER].Medium.LastFocused = this.Menus[menu_id.FILTER].Category.LastFocused;
    }
}

Player.prototype.mouseOverReferenceOrQuoteIdentifier = function(MenuID, identifier) {
    var MenuEntity = this.Menus[MenuID];
    if(this.MenusFocused.Item && MenuEntity.Item.LastFocused != identifier.closest(".ref"))
    {
        this.unfocusUIElement(focus_level.ITEM);
    }
    this.focusUIElement(focus_level.ITEM, MenuID, MenuEntity.Item, identifier.closest(".ref"));

    if(this.MenusFocused.Identifier && identifier != MenuEntity.Identifier.LastFocused)
    {
        this.unfocusUIElement(focus_level.IDENTIFIER);
    }
    this.focusUIElement(focus_level.IDENTIFIER, MenuID, MenuEntity.Identifier, identifier);
}

Player.prototype.mouseOverReferencesOrQuotes = function(MenuID, item) {
    var MenuEntity = this.Menus[MenuID];
    if(this.MenusFocused.Item && item != MenuEntity.Item.LastFocused)
    {
        this.unfocusUIElement(focus_level.ITEM);
    }
    this.focusUIElement(focus_level.ITEM, MenuID, MenuEntity.Item, item);

    var ourIdentifiers = item.querySelectorAll(".timecode");
    var weWereLastFocused = false;
    for(var i = 0; i < ourIdentifiers.length; ++i)
    {
        if(ourIdentifiers[i] == MenuEntity.Identifier.LastFocused)
        {
            weWereLastFocused = true;
        }
    }
    if(!weWereLastFocused)
    {
        this.unfocusUIElement(focus_level.IDENTIFIER);
    }
    this.focusUIElement(focus_level.IDENTIFIER, MenuID, MenuEntity.Identifier, getMostRecentCitation(this.currentTime, ourIdentifiers));
}

Player.prototype.mouseOverCredits = function(item) {
    if(this.MenusFocused.Item && item != this.Menus[menu_id.CREDITS].Item.LastFocused)
    {
        this.unfocusUIElement(focus_level.ITEM);
    }
    this.focusUIElement(focus_level.ITEM, menu_id.CREDITS, this.Menus[menu_id.CREDITS].Item, item);
}

function mouseSkipToTimecode(player, time, ev)
{
    player.setTimeThenPlay(parseFloat(time));
    ev.preventDefault();
    ev.stopPropagation();
    return false;
}

Player.prototype.handleMenuTogglerInteraction = function(menu, eventType)
{
    if(!menu.classList.contains("visible") && eventType == "mouseenter" ||
        menu.classList.contains("visible") && eventType == "mouseleave" ||
        (eventType == "click" && !menu.classList.contains("cineraHelp")))
    {
        if(menu.classList.contains("quotes"))
        {
            this.toggleMenuVisibility(menu_id.QUOTES, trigger_id.MOUSE);
        }
        else if(menu.classList.contains("references"))
        {
            this.toggleMenuVisibility(menu_id.REFERENCES, trigger_id.MOUSE);
        }
        else if(menu.classList.contains("filter"))
        {
            this.toggleMenuVisibility(menu_id.FILTER, trigger_id.MOUSE);
        }
        else if(menu.classList.contains("link"))
        {
            this.toggleMenuVisibility(menu_id.LINK, trigger_id.MOUSE);
        }
        else if(menu.classList.contains("credits"))
        {
            this.toggleMenuVisibility(menu_id.CREDITS, trigger_id.MOUSE);
        }
    }
}
