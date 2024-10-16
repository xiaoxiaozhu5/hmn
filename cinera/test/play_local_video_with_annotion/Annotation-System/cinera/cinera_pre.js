var orientations = {
    PORTRAIT: 0,
    LANDSCAPE_LEFT: 90,
    LANDSCAPE_RIGHT: -90,
};

function
DeriveReliableWindowDimensions()
{
    // https://www.howtocreate.co.uk/tutorials/javascript/browserwindow
    var Result = {
        X: null,
        Y: null,
    };

    var ScrollPosX = window.scrollX;
    var ScrollPosY = window.scrollY;

    var DisplaySettings = [];
    for(var i = 0; i < document.body.children.length; ++i)
    {
        var Child = document.body.children[i];
        DisplaySettings.push(Child.style.display);
        Child.style.display = "none";
    }

    var Element = document.createElement("div");
    Element.style.position = "fixed";
    Element.style.top = 0;
    Element.style.right = 0;
    Element.style.bottom = 0;
    Element.style.left = 0;
    Element.style.zOffset = -1;
    Element.style.opacity = 0;
    var ElementInPlace = document.body.appendChild(Element);
    Result.X = ElementInPlace.offsetWidth;
    Result.Y = ElementInPlace.offsetHeight;
    ElementInPlace.remove();

    for(var i = 0; i < document.body.children.length; ++i)
    {
        var Child = document.body.children[i];
        Child.style.display = DisplaySettings.shift();
    }

    ScrollTriggeredInternally = true;
    window.scroll(ScrollPosX, ScrollPosY);

    return Result;
}

function
GetWindowDim(IsMobile)
{
    var Result = {
        X: null,
        Y: null,
    };

    if(IsMobile)
    {
        Result = DeriveReliableWindowDimensions();
    }
    else
    {
        Result.X = document.documentElement.clientWidth;
        Result.Y = document.documentElement.clientHeight;
    }
    return Result;
}

function IsVisible(Element, WindowDim) {
    var BoundingRect = Element.getBoundingClientRect();
    return ((BoundingRect.top >= 0 && BoundingRect.top <= WindowDim.Y) ||
        (BoundingRect.bottom >= 0 && BoundingRect.bottom <= WindowDim.Y) ||
        (BoundingRect.top < 0 && BoundingRect.bottom > WindowDim.Y))
        && ((BoundingRect.left >= 0 && BoundingRect.left <= WindowDim.X) ||
        (BoundingRect.right >= 0 && BoundingRect.right <= WindowDim.X) ||
            (BoundingRect.left < 0 && BoundingRect.right > WindowDim.X));
}

function
GetRealOrientation(PreferredLandscape, IsMobile)
{
    var Result = screen.orientation.angle;
    var WindowDim = GetWindowDim(IsMobile);
    if(WindowDim.Y > WindowDim.X)
    {
        Result = orientations.PORTRAIT;
    }
    else if(Result == undefined || Result == orientations.PORTRAIT)
    {
        Result = PreferredLandscape;
    }
    return Result;
}

var DebugConsoleMessageCount = 0;
function Say(Message)
{
    var DebugConsole = document.getElementById("debug-console");
    if(DebugConsole)
    {
        DebugConsole.textContent += DebugConsoleMessageCount++ + ": " + Message + "\n";
        DebugConsole.scrollTo(
            {
                top: DebugConsole.scrollHeight,
                behavior: "smooth"
            });
    }
}

function getBackgroundBrightness(element) {
    var colour = getComputedStyle(element).getPropertyValue("background-color");
    var depth = 0;
    while((colour == "transparent" || colour == "rgba(0, 0, 0, 0)") && depth <= 4)
    {
        element = element.parentNode;
        colour = getComputedStyle(element).getPropertyValue("background-color");
        ++depth;
    }
	var rgb = colour.slice(4, -1).split(", ");
	var result = Math.sqrt(rgb[0] * rgb[0] * .241 +
	rgb[1] * rgb[1] * .691 +
	rgb[2] * rgb[2] * .068);
    return result;
}

function setSpriteLightness(spriteElement)
{
    if(getBackgroundBrightness(spriteElement) < 127)
    {
        spriteElement.classList.add("dark");
    }
    else
    {
        spriteElement.classList.remove("dark");
    }
}

function elementIsFocused(Element)
{
    var Result = false;
    if(Element.classList.contains("focused"))
    {
        Result = true;
    }
    while(Element.parent)
    {
        Element = Element.parent;
        if(Element.classList.contains("focused"))
        {
            Result = true;
            break;
        }
    }
    return Result;
}

function focusSprite(Element)
{
    if(Element.classList.contains("cineraSprite"))
    {
        setSpriteLightness(Element);
        Element.style.backgroundPositionY = Element.getAttribute("data-y-focused") + "px";
    }
    for(var i = 0; i < Element.childElementCount; ++i)
    {
        focusSprite(Element.children[i]);
    }
}

function enableSprite(Element)
{
    if(Element.classList.contains("focused"))
    {
        focusSprite(Element);
    }
    else
    {
        if(Element.classList.contains("cineraSprite"))
        {
            setSpriteLightness(Element);
            Element.style.backgroundPositionY = Element.getAttribute("data-y-normal") + "px";
        }
        for(var i = 0; i < Element.childElementCount; ++i)
        {
            enableSprite(Element.children[i]);
        }
    }
}

function disableSprite(Element)
{
    if(Element.classList.contains("focused"))
    {
        focusSprite(Element);
    }
    else
    {
        if(Element.classList.contains("cineraSprite"))
        {
            setSpriteLightness(Element);
            Element.style.backgroundPositionY = Element.getAttribute("data-y-disabled") + "px";
        }
        for(var i = 0; i < Element.childElementCount; ++i)
        {
            disableSprite(Element.children[i]);
        }
    }
}

function unfocusSprite(Element)
{
    if(Element.classList.contains("off"))
    {
        disableSprite(Element);
    }
    else
    {
        if(Element.classList.contains("cineraSprite"))
        {
            setSpriteLightness(Element);
            Element.style.backgroundPositionY = Element.getAttribute("data-y-normal") + "px";
        }
        for(var i = 0; i < Element.childElementCount; ++i)
        {
            unfocusSprite(Element.children[i]);
        }
    }
}

function IsMobile() {
    // NOTE(matt): From https://medium.com/simplejs/detect-the-users-device-type-with-a-simple-javascript-check-4fc656b735e1
    var Identifier = navigator.userAgent||navigator.vendor||window.opera;
    var Result = (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(Identifier)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(Identifier.substr(0,4)));
    return Result;
};

function GetRule(SelectorText)
{
    // NOTE(matt):  Modifying CSS style
    //              From    https://stackoverflow.com/a/566445
    //                      https://usefulangle.com/post/39/adding-css-to-stylesheet-with-javascript
    var Result = undefined;

    var StyleSheets = document.styleSheets;
    var cssRuleCode = document.all ? 'rules' : 'cssRules'; // account for IE and FF
    for(var StyleSheetIndex = StyleSheets.length - 1; StyleSheetIndex >= 0; --StyleSheetIndex)
    {
        var ThisSheet = StyleSheets[StyleSheetIndex];
        if(ThisSheet.href !== null && ThisSheet.href.includes(location.hostname))
        {
            var Rules = ThisSheet[cssRuleCode];
            for(var RuleIndex = Rules.length - 1; RuleIndex >= 0; --RuleIndex)
            {
                var ThisRule = Rules[RuleIndex];
                if(SelectorText === ThisRule.selectorText)
                {
                    Result = ThisRule;
                    break;
                }
            }
            if(Result !== undefined) { break; }
        }
    }

    return Result;
}

function
GetRulesOfStyleSheetIndex(Index)
{
    var Result = undefined;
    var StyleSheets = document.styleSheets;
    var cssRuleCode = document.all ? 'rules' : 'cssRules'; // account for IE and FF
    var StyleSheet = StyleSheets[Index];
    if(StyleSheet)
    {
        Result = StyleSheet[cssRuleCode];
    }
    return Result;
}

function
GetLocalStyleSheet()
{
    var Result;
    var StyleSheets = document.styleSheets;
    for(var StyleSheetIndex = StyleSheets.length - 1; StyleSheetIndex >= 0; --StyleSheetIndex)
    {
        var This = StyleSheets[StyleSheetIndex];
        if(This.href !== null && This.href.includes(location.hostname) && !This.disabled)
        {
            Result = This;
            break;
        }
    }
    return Result;
}

function
GetOrSetRule(SelectorText)
{
    var Result = GetRule(SelectorText);
    if(Result === undefined)
    {
        var StyleSheet = GetLocalStyleSheet();
        if(StyleSheet)
        {
            var cssRuleCode = document.all ? 'rules' : 'cssRules'; // account for IE and FF
            var Rules = StyleSheet[cssRuleCode];
            var RuleIndex = StyleSheet.insertRule(SelectorText + "{}", Rules.length - 1);
            Result = Rules[RuleIndex];
        }
    }
    return Result;
}

function IsInRangeEx(Min, N, Max)
{
    return N > Min && N < Max;
}

/* Auto-scrolling */
var ScrollTriggeredInternally = false;
var LastScrollYPos = 0;
var ScrollTicking = false;
var ScrollerFunction;
var ScrollCondition;

function ScrollTo(Element, ScrollPos, IsMobile, StickyObscuringElement) {
    if(Element.offsetWidth && Element.offsetHeight)
    {
        var ScrolledToTop = ScrollPos == 0;
        var ScrolledToBottom = (window.innerHeight + Math.ceil(window.pageYOffset)) >= document.body.scrollHeight;
        if(!ScrolledToTop || !ScrolledToBottom)
        {
            var Ceiling = StickyObscuringElement ? StickyObscuringElement.offsetHeight : 0;
            var VisibleArea = GetWindowDim(IsMobile);
            VisibleArea.Y -= Ceiling;

            var PercentageOfVisibleHeightToGather = 5;
            var GatherableHeight = VisibleArea.Y * PercentageOfVisibleHeightToGather / 100;

            var BoundingRect = Element.getBoundingClientRect();

            var ElementTop = BoundingRect.top - Ceiling;
            var ElementBottom = ElementTop + BoundingRect.height;

            var UpperProtrusion = -ElementTop;
            var LowerProtrusion = ElementBottom - VisibleArea.Y;

            var DesiredScroll = null;
            var YOffsetFromPage = getElementYOffsetFromPage(Element);
            if(IsInRangeEx(0, UpperProtrusion, GatherableHeight))
            {
                if(!ScrolledToBottom)
                {
                    DesiredScroll = YOffsetFromPage - Ceiling;
                }
            }
            else if(IsInRangeEx(0, LowerProtrusion, GatherableHeight))
            {
                if(!ScrolledToTop)
                {
                    if(IsInRangeEx(0, UpperProtrusion + LowerProtrusion, GatherableHeight))
                    {
                        DesiredScroll = YOffsetFromPage - Ceiling;
                    }
                    else
                    {
                        DesiredScroll = ScrollPos + LowerProtrusion;
                    }
                }
            }

            if(DesiredScroll !== null && DesiredScroll != ScrollPos)
            {
                window.scrollTo({
                    top: DesiredScroll,
                    behavior: "smooth"
                });
            }
        }
    }
}

function
InitScrollEventListener(Element, IsMobile, StickyObscuringElement)
{
    window.addEventListener('scroll', function() {
        if(ScrollTriggeredInternally)
        {
            ScrollTriggeredInternally = false;
        }
        else if(ScrollCondition == undefined || ScrollCondition == true)
        {
            LastScrollYPos = window.scrollY;

            if (!ScrollTicking) {
                window.requestAnimationFrame(function() {
                    clearTimeout(ScrollerFunction);
                    ScrollerFunction = setTimeout(ScrollTo, 2000, Element, LastScrollYPos, IsMobile, StickyObscuringElement);
                    ScrollTicking = false;
                });

                ScrollTicking = true;
            }
        }
    });
}
/* /Auto-scrolling */

function getElementXOffsetFromPage(el) {
    var left = 0;
    do {
        left += el.offsetLeft;
    } while (el = el.offsetParent);
    return left;
}

function getElementYOffsetFromPage(el) {
    var top = 0;
    do {
        top += el.offsetTop;
    } while (el = el.offsetParent);
    return top;
}

function
MaxWidthOfElement(Element, WindowDim)
{
    // NOTE(matt):  This works fine for Elements whose natural max width fills the whole line, i.e. block elements and children
    //              thereof. To support inline elements, we'll need to mirror MaxHeightOfElement() and may as well roll the two
    //              functions into one.
    var Result = 0;

    var OriginalWidth = Element.style.width;
    Element.style.width = "100%";
    var NaturalMax = Element.offsetWidth;
    Element.style.width = OriginalWidth;

    var InnerWidth = WindowDim ? WindowDim.X : document.documentElement.clientWidth;
    Result = Math.min(NaturalMax, InnerWidth);
    return Result;
}

function
MaxHeightOfElement(Element, WindowDim)
{
    var Result = 0;

    var DisplaySettings = [];
    for(var i = 0; i < Element.children.length; ++i)
    {
        var Child = Element.children[i];
        DisplaySettings.push(Child.style.display);
        Child.style.display = "none";
    }

    var OriginalHeight = Element.style.height;
    Element.style.height = "100%";
    var NaturalMax = Element.offsetHeight;
    Element.style.height = OriginalHeight;

    var InnerHeight = WindowDim ? WindowDim.Y : document.documentElement.clientHeight;
    if(NaturalMax > 0)
    {
        Result = Math.min(NaturalMax, InnerHeight);
    }
    else
    {
        Result = InnerHeight;
    }

    for(var i = 0; i < Element.children.length; ++i)
    {
        var Child = Element.children[i];
        Child.style.display = DisplaySettings.shift();
    }

    return Result;
}

function
MaxDimensionsOfElement(Element, WindowDim)
{
    var Result = {
        X: null,
        Y: null,
    };
    Result.X = MaxWidthOfElement(Element, WindowDim);
    Result.Y = MaxHeightOfElement(Element, WindowDim);
    return Result;
}

function
Clamp(EndA, N, EndB)
{
    var Min = EndA < EndB ? EndA : EndB;
    var Max = EndA > EndB ? EndA : EndB;
    return N < Min ? Min : N > Max ? Max : N;
}

function
Clamp01(N)
{
    return N < 0 ? 0 : N > 1 ? 1 : N;
}

function
Lerp(A, t, B)
{
    return (1-t)*A + t*B;
}

function
IsOverflowed(Element)
{
    return Element.scrollHeight > Element.clientHeight || Element.scrollWidth > Element.clientWidth;
}

function
SetHelpUnfocused(Button)
{
    Button.firstElementChild.innerText = "¿";
    Button.firstElementChild.title = "Keypresses will not pass through to Cinera because focus is currently elsewhere.\n\nTo regain focus, please press Tab / Shift-Tab (multiple times) or click somewhere related to Cinera other than the video, e.g. this button";
}

function
SetHelpFocused(Button)
{
    Button.firstElementChild.innerText = "?";
    Button.firstElementChild.title = ""
}

function
BindHelp(Button, DocumentationContainer)
{
    window.addEventListener("blur", function(){
        SetHelpUnfocused(Button);
    });

    window.addEventListener("focus", function(){
        SetHelpFocused(Button);
    });

    Button.addEventListener("click", function() {
        DocumentationContainer.classList.toggle("visible");
    })
}

function getBackgroundColourRGB(element) {
    var Colour = getComputedStyle(element).getPropertyValue("background-color");
    var depth = 0;
    while((Colour == "transparent" || Colour == "rgba(0, 0, 0, 0)") && element.parentElement && depth <= 4)
    {
        element = element.parentElement;
        Colour = getComputedStyle(element).getPropertyValue("background-color");
        ++depth;
    }
	var Staging = Colour.slice(Colour.indexOf("(") + 1, -1).split(", ");
    var Result = {
        R: parseInt(Staging[0]),
        G: parseInt(Staging[1]),
        B: parseInt(Staging[2]),
    };
    return Result;
}

function getBackgroundBrightness(element) {
	var Colour = getBackgroundColourRGB(element);
	var Result = Math.sqrt(Colour.R * Colour.R * .241 +
	Colour.G * Colour.G * .691 +
	Colour.B * Colour.B * .068);
    return Result;
}

function setTextLightness(textElement)
{
    var textHue = textElement.getAttribute("data-hue");
    var textSaturation = textElement.getAttribute("data-saturation");
    if(textHue && textSaturation)
    {
        if(getBackgroundBrightness(textElement.parentNode) < 127)
        {
            textElement.style.color = ("hsl(" + textHue + ", " + textSaturation + ", 76%)");
        }
        else
        {
            textElement.style.color = ("hsl(" + textHue + ", " + textSaturation + ", 24%)");
        }
    }
}

function setDotLightness(topicDot)
{
    var dotHue = topicDot.getAttribute("data-hue");
    var dotSaturation = topicDot.getAttribute("data-saturation");
    if(dotHue && dotSaturation)
    {
        if(getBackgroundBrightness(topicDot.parentNode) < 127)
        {
            topicDot.style.backgroundColor = ("hsl(" + dotHue + ", " + dotSaturation + ", 76%)");
            topicDot.style.borderColor = ("hsl(" + dotHue + ", " + dotSaturation + ", 76%)");
        }
        else
        {
            topicDot.style.backgroundColor = ("hsl(" + dotHue + ", " + dotSaturation + ", 47%)");
            topicDot.style.borderColor = ("hsl(" + dotHue + ", " + dotSaturation + ", 47%)");
        }
    }
}
