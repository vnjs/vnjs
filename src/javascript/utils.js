"use strict";

/* globals CanvasRenderingContext2D XMLHttpRequest */

// Shared utility functions,

function isUndefined(v) {
    return (v === void 0);
}


function polyfill2DCanvas() {
    let crc2d = CanvasRenderingContext2D.prototype;
    if (!crc2d.resetTransform) {
        crc2d.resetTransform = function() {
            this.setTransform(1, 0, 0, 1, 0, 0);
        };
    }
}

// Adds all properties from c2 into c1 provided the property
// name isn't already defined in c1. This function does not modify
// c2. Only c1 can be changed by this operation.
function mergeConfig(c1, c2) {
    for (let k in c2) {
        if (isUndefined(c1[k])) {
            c1[k] = c2[k];
        }
    }
    return c1;
}

// Asynchronous load file from the given uri,
function loadFile(uri, callback) {
    const req = new XMLHttpRequest();
    req.addEventListener("load", function() {
        if (req.readyState === 4) {
            if (req.status === 200) {
                callback({ req });
            }
            else {
                callback({ fail:req.statusText, req });
            }
        }
    });
    req.addEventListener("error", function() {
        callback({ fail:req.statusText, req });
    });
    req.open("GET", uri, true);
    req.send(null);
}

function Rectangle(x, y, wid, hei) {
    return { x, y, wid, hei };
}

module.exports = {
    isUndefined,
    mergeConfig,
    polyfill2DCanvas,
    loadFile,
    Rectangle
};
