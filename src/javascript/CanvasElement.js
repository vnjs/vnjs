"use strict";

const { isUndefined } = require('./utils');



function CanvasElement() {
  
  let dirty = true;
  
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
    setStyle('depth', depth);
  };
  function setLocation(x, y) {
    if (style.x !== x || style.y !== y) {
      setDirty();
    }
    style.x = x;
    style.y = y;
  };
  function setX(x) {
    setStyle('x', x);
  };
  function setY(y) {
    setStyle('y', y);
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
      setDirty();
    }
  };
  function setScaleX(sx) {
    setStyle('scale_x', sx);
  };
  function setScaleY(sy) {
    setStyle('scale_y', sy);
  };
  function setDrawAlpha(alpha) {
    setStyle('alpha', alpha);
  };
  function setRotation(rot) {
    setStyle('rotation', rot);
  };
  function setNoScaleFactor(bool) {
    setStyle('noScaleFactor', bool);
  };
  function setRawStyles(in_styles) {
    for (const f in in_styles) {
      setStyle(f, in_styles[f]);
    }
  };
  
  function setStyle(prop, val) {
    if (style[prop] !== val) {
      setDirty();
    }
    style[prop] = val;
  };
  
  function getStyles() {
    return style;
  };
  
  function getStyle(prop) {
    return style[prop];
  }
  
  function setDirty() {
    dirty = true;
  };
  
  function isDirty() {
    return dirty;
  };
  
  function resetDirty() {
    dirty = false;
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
    getStyle,
    
    setDirty,
    isDirty,
    resetDirty,
    
  };

}

exports.CanvasElement = CanvasElement;
