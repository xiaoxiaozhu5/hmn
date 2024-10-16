// NOTE(matt):  To use, source this file inside the element you wish to be obscured while processing occurs.
//              After processing is complete, call FlipClear()

var ThisScriptElement = document.currentScript;
var NodeToHide = ThisScriptElement.parentNode;

var CineraClearElement = document.createElement("DIV");
CineraClearElement.style.position = "fixed";
CineraClearElement.style.height = "100%";
CineraClearElement.style.width = "100%";
CineraClearElement.style.zIndex = 64;

var CineraPlacedClear = NodeToHide.appendChild(CineraClearElement);
var Colour = getBackgroundColourRGB(CineraPlacedClear);
CineraPlacedClear.style.background = "rgb(" + Colour.R + ", " + Colour.G + ", " + Colour.B + ")"
document.body.style.overflowY = "hidden";

function
FlipClear(BodyOverflowY)
{
    document.body.style.overflowY = BodyOverflowY ? BodyOverflowY : null;
    CineraPlacedClear.parentNode.removeChild(CineraPlacedClear);
}
