"use strict";

import { isUndefined } from './utils';



function Interpolation(type, ms_to, canvas_element) {
  let time_start = performance.now();
  return {
    type,
    time_start,
    ms_to,
    canvas_element
  };
};







const STATICS = Object.freeze({
  NOT_SET: 'not set',
  INTERRUPTABLE_PAUSE: 'interruptable pause',
  WAIT_UNTIL_INTERACT: 'wait until interact',
});


// t = current time
// d = total time
// b = beginning value
// c = difference of value
function noEasing(t, d, b, c) {
  return c * ( t / d ) + b;
};

// http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm

function easeOut(t, d, b, c) {
  var ts = (t/=d) * t;
  var tc = ts * t;
  return b + c * (-1 * tc * ts + 4 * ts * ts + -5 * tc + ts + 2 * t);
};

function easeIn(t, d, b, c) {
  var ts=(t/=d)*t;
  var tc=ts*t;
  return b+c*(0.5*tc*ts + -1.5*ts*ts + 2*tc);
};

function easingFunction(easing, t, d, b, c) {
  switch (easing) {
    case 'noease':
      return noEasing(t, d, b, c);
    case 'easeout1':
      return easeOut(t, d, b, c);
    case 'easein1':
      return easeIn(t, d, b, c);
    default:
      throw new Error('Unknown easing: ' + easing);
  }
};



const Scene = function(g, scene_function) {

  let frame_transition_type = STATICS.NOT_SET;
  let frame_transition_params = [];
  let frame_text_trail_in_frame = false;

  function interruptablePause(time_ms) {
    frame_transition_type = STATICS.INTERRUPTABLE_PAUSE;
    frame_transition_params = [ time_ms ];
  };
  
  function waitOnInteract() {
    frame_transition_type = STATICS.WAIT_UNTIL_INTERACT;
    frame_transition_params = [];
  };
  
  function transitionAlpha(element_id, ms_to, dest_alpha, easing) {
    const canvas_element = g.getCanvasElement(element_id);
    const i = Interpolation('alpha', ms_to, canvas_element);
    // Define the starting and ending alpha values to interpolate over,
    i.start_x = canvas_element.alpha;
    i.end_x = dest_alpha;
    
    i.interpolate = function(ts) {
      const ts_av = easingFunction(easing, ts - i.time_start, ms_to, i.start_x, i.end_x - i.start_x);
      canvas_element.setDrawAlpha( ts_av );
    };
    i.complete = function() {
      canvas_element.setDrawAlpha(i.end_x);
    };

    g.addInterpolation(i, ms_to);
  };
  
  function transitionAlphaFadeIn(element_id, ms_to, easing) {
    transitionAlpha(element_id, ms_to, 1.0, easing);
  };
  
  function transitionAlphaFadeOut(element_id, ms_to, easing) {
    transitionAlpha(element_id, ms_to, 0.0, easing);
  };

  function transitionPosition(element_id, ms_to, dest_x, dest_y, easing) {
    const canvas_element = g.getCanvasElement(element_id);
    const i = Interpolation('pos', ms_to, canvas_element);
    // Define the starting and ending alpha values to interpolate over,
    i.start_x = canvas_element.x;
    i.start_y = canvas_element.y;
    i.end_x = dest_x;
    i.end_y = dest_y;
    
    i.interpolate = function(ts) {
      const ts_x = easingFunction(easing, ts - i.time_start, ms_to, i.start_x, i.end_x - i.start_x);
      const ts_y = easingFunction(easing, ts - i.time_start, ms_to, i.start_y, i.end_y - i.start_y);
      canvas_element.setLocation( ts_x, ts_y );
    };
    i.complete = function() {
      canvas_element.setLocation( i.end_x, i.end_y );
    };

    g.addInterpolation(i, ms_to);
  };
  
  function setLocation(element_id, x, y) {
    const canvas_element = g.getCanvasElement(element_id);
    canvas_element.setLocation(x, y);
  };
  
  function setDrawAlpha(element_id, alpha) {
    const canvas_element = g.getCanvasElement(element_id);
    canvas_element.setDrawAlpha(alpha);
  };
  
  function setDepth(element_id, depth) {
    const canvas_element = g.getCanvasElement(element_id);
    canvas_element.setDepth(depth);
    g.notifyDoSortDepthBeforeDraw();
  };
  
  function printDialogText(source_name, text) {
    g.printDialogText(source_name, text);
    frame_text_trail_in_frame = true;
  };
  
  
  function clearFrame() {
    frame_transition_type = STATICS.NOT_SET;
    frame_transition_params = [];
    frame_text_trail_in_frame = false;
  };
  
  function isDisplayingTextTrail() {
    return frame_text_trail_in_frame;
  };
  
  function getNextFrameTransitionType() {
    return frame_transition_type;
  };
  
  function getNextFrameTransitionParams() {
    return frame_transition_params;
  };
  
  
  
  // Public members,
  return Object.freeze({
    interruptablePause,
    waitOnInteract,
    transitionAlpha,
    transitionAlphaFadeIn,
    transitionAlphaFadeOut,
    transitionPosition,
    setLocation,
    setDrawAlpha,
    setDepth,
    printDialogText,
    
    clearFrame,
    isDisplayingTextTrail,
    getNextFrameTransitionType,
    getNextFrameTransitionParams,
    
    STATICS,
    
  });
    
};
Scene.STATICS = STATICS;


export default Scene;
