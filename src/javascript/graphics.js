"use strict";

const { isUndefined } = require('./utils');

// Various graphics utilities.


// Returns true when the given point (represented as an x, y coordinate in an
// array) is inside the polygon represented by the set of coordinates in
// vs. eg.
//   point = [5, 5], vs = [[0, 0], [10, 0], [10, 10], [0, 10]], result = true.
function isInsidePolygon(point, vs) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  const x = point[0];
  const y = point[1];

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

function createShadowHueGradient(ctx, mid_x, mid_y, width, height, hue) {
  const gradient = ctx.createRadialGradient(
                          mid_x, mid_y, 0, mid_x, mid_y,
                          (Math.min(width / 2, height / 2)) * 1.25);
  const hue_int = parseInt(hue);
  gradient.addColorStop(0,  'hsla(' + (hue_int) + ', 30%, 27%, .78 )');
  gradient.addColorStop(.1, 'hsla(' + (hue_int) + ', 30%, 27%, .78 )');
  gradient.addColorStop(.4, 'hsla(' + (hue_int + 3) + ', 35%, 25%, .8 )');
  gradient.addColorStop(1,  'hsla(' + (hue_int + 12) + ', 60%, 15%, .9 )');
  return gradient;
};

// Stokes a rounded rectangle,
function roundedRect(ctx, x, y, width, height, radius) {

  if (radius === void 0) radius = 0;

  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.arcTo(x + width, y + height, x + width, y + height-radius, radius);
  ctx.lineTo(x + width, y + radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.lineTo(x + radius, y);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.closePath();

};




// Paints a rounded rectangle filled with a radial shadow gradient.
function roundedShadowedRect(ctx, x, y, width, height, radius, style) {
  
  let { outer_border_stroke_style, inner_border_stroke_style, background_gradient } = style;
  
  if (isUndefined(outer_border_stroke_style)) outer_border_stroke_style = '#000a22';
  if (isUndefined(inner_border_stroke_style)) inner_border_stroke_style = '#bbbbe0';
  
  const in_global_alpha = ctx.globalAlpha;

  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.arcTo(x + width, y + height, x + width, y + height-radius, radius);
  ctx.lineTo(x + width, y + radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.lineTo(x + radius, y);
  ctx.arcTo(x, y, x, y + radius, radius);

  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.clip();
    ctx.globalAlpha = in_global_alpha;

    const SF = (width / height) * 1;

    // Create a blue shadow gradient.
    let gradient;
    if (isUndefined(background_gradient)) {
      const mid_x = ((width / 2) + x) / SF;
      const mid_y = (height / 2) + y;
      gradient = createShadowHueGradient(ctx, mid_x, mid_y, width, height, 208);
    }
    else {
      gradient = background_gradient;
    }

    ctx.scale(SF, 1);

    ctx.fillStyle = gradient;
    ctx.fillRect(x / SF, y, width / SF, height);

  }
  finally {
    ctx.restore();
  }

  ctx.globalAlpha = .9 * in_global_alpha;
  ctx.strokeStyle = outer_border_stroke_style; //'#000a22';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = inner_border_stroke_style; //'#bbbbe0';
  ctx.lineWidth = 2.1;
  ctx.stroke();
  ctx.globalAlpha = 1 * in_global_alpha;
  ctx.closePath();
  
};



module.exports = { isInsidePolygon, roundedRect, roundedShadowedRect, createShadowHueGradient };
