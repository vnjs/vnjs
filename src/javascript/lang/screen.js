"use strict";

// Adds an element to the screen and returns a proxy object for controlling
// the element.

function addElement(ele) {

}

// Creates a standard element on the client.

function element(style) {

    let mod_style;



    function animate(animate_styles, time, transform_type) {
        // Animate the element from the current style to a style with the given
        // modifications 'animate_styles' over a time period using the given
        // transform type.
        if (mod_style === void 0) {
            mod_style = {};
        }
        for (let key in animate_styles) {
            mod_style[key] = animate_styles[key];
        }

        // Send the style transition to the client,
        console.log("PENDING; Send style transition to client!");

    }

    function getStyle() {
        const nstyle = {};
        // Shallow copy,
        for (let key in style) {
            nstyle[key] = style[key];
        }
        // Merge with mod styles,
        if (mod_style !== void 0) {
            for (let key in mod_style) {
                nstyle[key] = mod_style[key];
            }
        }
        return nstyle;
    }

    return {
        animate,
        getStyle
    };
}


// A standard element that draws a checkered pattern

function checkeredElement(style) {
    return element({
        class: 'std/checkeredElement',
        name: style.name,
        layer: style.layer,
        width: style.width,
        height: style.height,
        pattern_width: style.pattern_width,
        pattern_height: style.pattern_height,
        pattern_color1: style.pattern_color1,
        pattern_color2: style.pattern_color2,
    });
}


module.exports = {
    addElement,
    element,
    checkeredElement,
};
