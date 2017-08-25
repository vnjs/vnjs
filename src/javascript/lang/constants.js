"use strict";

const screen = require('./screen.js');

const checkeredBackground = screen.checkeredElement({
    layer: -10,
    width: '100%',
    height: '100%',
    pattern_width: 32,
    pattern_height: 32,
    pattern_color1: '#f0f0f0',
    pattern_color2: '#ffffff',
});


module.exports = {
    checkeredBackground
};
