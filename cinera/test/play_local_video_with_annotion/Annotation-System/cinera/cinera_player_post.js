var baseURL = location.hash ? (location.toString().substr(0, location.toString().length - location.hash.length)) : location;

var CineraProps = {
    C: null,
    V: views.REGULAR,
    Z: null,
    X: null,
    Y: null,
    W: null,
    mW: null,
    H: null,
    mH: null,
    P: null,
    Display: null,
    FlexDirection: null,
    JustifyContent: null,
    O: null,
    IsMobile: IsMobile(),
    ScrollX: null,
    ScrollY: null,
    VODPlatform: null,
};
CineraProps.O = GetRealOrientation(orientations.LANDSCAPE_LEFT, CineraProps.IsMobile);

//var MobileCineraContentRuleSelector = ".cinera.mobile .cineraPlayerContainer .markers_container > .markers .marker .cineraContent";
//var MobileCineraContentRule = GetOrSetRule(MobileCineraContentRuleSelector);

var MenuContainerRuleSelector = ".cineraMenus > .menu .quotes_container, .cineraMenus > .menu .references_container, .cineraMenus > .menu .filter_container, .cineraMenus > .menu .views_container, .cineraMenus > .menu .link_container, .cineraMenus > .menu .credits_container";
var MenuContainerRule = GetOrSetRule(MenuContainerRuleSelector);

var cinera = document.querySelector(".cinera");
var player = new Player(cinera, onRefChanged);

window.addEventListener("resize", function() {
    if(CineraProps.IsMobile)
    {
        setTimeout(DelayedUpdateSize, 512, player);
    }
    else
    {
        player.updateSize();
    }
});

screen.orientation.onchange = function() {
    if(CineraProps.IsMobile)
    {
        setTimeout(DelayedUpdateSize, 512, player);
    }
    else
    {
        player.updateSize();
    }
};

document.addEventListener("keydown", function(ev) {
    var key = ev.key;
    if(ev.getModifierState("Shift") && key == " ")
    {
        key = "capitalSpace";
    }

    if(!ev.getModifierState("Control") && player.handleKey(key) == true && player.MenusFocused.Item)
    {
        ev.preventDefault();
    }
});

document.addEventListener("fullscreenchange", function() {
    if(!document.fullscreenElement && CineraProps.V == views.SUPERTHEATRE)
    {
        CineraProps.V = views.THEATRE;
        localStorage.setItem(player.cineraViewStorageItem, views.THEATRE);
        player.updateSize();
    }
});
