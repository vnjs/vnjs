"use strict";

const { isUndefined } = require('./utils');



function CanvasElement() {
  
  const style = {
    x: 0,
    y: 0,
    depth: 1,
    rotation: 0,
    scale_x: 1,
    scale_y: 1,
    alpha: 0,
  };
  
  function setDepth(depth) {
    style.depth = depth;
  };
  function setLocation(x, y) {
    style.x = x;
    style.y = y;
  };
  function setX(x) {
    style.x = x;
  };
  function setY(y) {
    style.y = y;
  };
  function setScale(x, y) {
    if (!isUndefined(x)) {
      if (isUndefined(y)) {
        style.scale_x = x;
        style.scale_y = x;
      }
      else {
        style.scale_x = x;
        style.scale_y = y;
      }
    }
  };
  function setScaleX(sx) {
    style.scale_x = sx;
  };
  function setScaleY(sy) {
    style.scale_y = sy;
  };
  function setDrawAlpha(alpha) {
    style.alpha = alpha;
  };
  function setRotation(rot) {
    style.rotation = rot;
  };
  function setNoScaleFactor(bool) {
    style.noScaleFactor = bool;
  };
  function setRawStyles(in_styles) {
    for (let f in in_styles) {
      // Protect 'type' field
      if (f !== 'type') {
        style[f] = in_styles[f];
      }
    }
  };
  
  function setStyle(prop, val) {
    style[prop] = val;
  };
  
  function getStyles() {
    return style;
  };
  
  function getBounds() {
    const rot = style.rotation;
    if (rot !== 0) {
      // Account for rotation,
      var wid = style.width * style.scale_x;
      var hei = style.height * style.scale_y;
      var rot_width = Math.sin(rot) * hei + Math.cos(rot) * wid;
      var rot_height = Math.sin(rot) * wid + Math.cos(rot) * hei;
      return Rectangle(
            (style.x * style.scale_x) - (rot_width / 2),
            (style.y * style.scale_y) - (row_height / 2),
            row_width, rot_height );
    }
    else {
      return Rectangle(
            (style.x - (style.width / 2)) * style.scale_x,
            (style.y - (style.height / 2)) * style.scale_y,
            style.width * style.scale_x,
            style.height * style.scale_y );
    }
  };

  return {
    type: 'EMPTY',
    style,
    
    setDepth,
    setLocation,
    setScale,
    setDrawAlpha,
    setRotation,
    setNoScaleFactor,
    getBounds,
    setX,
    setY,
    setScaleX,
    setScaleY,
    setRawStyles,
    setStyle,
    getStyles,
  };

}

exports.CanvasElement = CanvasElement;
