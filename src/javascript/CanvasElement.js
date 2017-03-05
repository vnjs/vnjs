"use strict";

import { isUndefined } from './utils';



function CanvasElement(id) {
  
  const ce = {
    type: 'EMPTY',
    id,
    x: 0,
    y: 0,
    depth: 1,
    rotation: 0,
    scale_x: 1,
    scale_y: 1,
    drawAlpha: 1,
  };
  
  function setDepth(depth) {
    ce.depth = depth;
  };
  function setLocation(x, y) {
    ce.x = x;
    ce.y = y;
  };
  function setScale(x, y) {
    if (!isUndefined(x)) {
      if (isUndefined(y)) {
        ce.scale_x = x;
        ce.scale_y = x;
      }
      else {
        ce.scale_x = x;
        ce.scale_y = y;
      }
    }
  };
  function setDrawAlpha(alpha) {
    ce.drawAlpha = alpha;
  };
  function setNoScaleFactor(bool) {
    ce.noScaleFactor = bool;
  };
  function getBounds() {
    if (this.rotation !== 0) {
      // Account for rotation,
      var wid = (ce.mid_x * 2) * ce.scale_x;
      var hei = (ce.mid_y * 2) * ce.scale_y;
      var rot_width = Math.sin(ce.rotation) * hei + Math.cos(ce.rotation) * wid;
      var rot_height = Math.sin(ce.rotation) * wid + Math.cos(ce.rotation) * hei;
      return Rectangle(
            (ce.x * ce.scale_x) - (rot_width / 2),
            (ce.y * ce.scale_y) - (row_height / 2),
            row_width, rot_height );
    }
    else {
      return Rectangle(
            (ce.x - ce.mid_x) * ce.scale_x,
            (ce.y - ce.mid_y) * ce.scale_y,
            (ce.mid_x * 2) * ce.scale_x,
            (ce.mid_y * 2) * ce.scale_y );
    }
  };
  
  ce.setDepth = setDepth;
  ce.setLocation = setLocation;
  ce.setScale = setScale;
  ce.setDrawAlpha = setDrawAlpha;
  ce.setNoScaleFactor = setNoScaleFactor;
  ce.getBounds = getBounds;

  return ce;  
}

export default CanvasElement;