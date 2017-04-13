"use strict";

const { isUndefined, mergeConfig, polyfill2DCanvas, Rectangle } = require('./utils');
const { isInsidePolygon } = require('./graphics.js');

const TextFormatter = require('./TextFormatter').TextFormatter;
const CanvasElement = require('./CanvasElement').CanvasElement;
const TextTrail = require('./TextTrail').TextTrail;

const EventEmitter = require('events');

// Visual Novel engine base library script.
//
// Exports;
//    NVScreen(canvas, config)
//
// Instantiate the function with the display canvas element of the desired
// size.

// Polyfills,
polyfill2DCanvas();



// Default configuration,
const DEF_CONFIG = {

  enable_dirty_clipping: false,
  
};

// VNScreen factory function,
function VNScreen(canvas_window_element, config) {
  
  if (this instanceof VNScreen) throw new Error("Not a class");
  
  if (isUndefined(config)) {
    config = DEF_CONFIG.slice();
  }
  else {
    mergeConfig(config, DEF_CONFIG);
  }
  
  class VNScreenEmitter extends EventEmitter {}
  const eventer = new VNScreenEmitter();
  
  // The VNScreen object output,
  let out_vnscreen;

  const overall_scale = canvas_window_element.height / 720;

  // The current stack of UI hit groups,
  const hit_group_stack = [];
  // The hit keys of current areas that are hovered by the mouse pointer,
  let current_hovered_areas = [];

  // The current set of active elements to draw on the canvas, sorted by z depth.
  const canvas_elements = [];
  
  // When this is set to true, the canvas elements are sorted by depth on the
  // next draw call.
  let sort_depth_before_draw = false;
  
  // The action queue is a list of animation actions to perform on elements on the
  // canvas.
  const active_interpolations = [];

  
  let frame_needs_repaint = true;
  
  let scaling_factor = 720 / (1024 * 1.1);
//  console.log("Scaling Factor: ", scaling_factor);
  
  let time_framestamp_valid = false;
  let cur_time_framestamp = -1;
  
  // Called and cleared when an interact event happens,
  let interact_callback;
  
  
  // Maps image id to Image object,
  const images_map = {};
  
  // The HTML5 Canvas 2D context,
  const canvas_2dctx = canvas_window_element.getContext("2d");


  // Event capture,
  canvas_window_element.focus();
  canvas_window_element.addEventListener( 'mousedown', (evt) => {
    // Capture the focus immediately when clicked,
    canvas_window_element.focus();
  }, false );
  canvas_window_element.addEventListener( 'click', (evt) => {
    // On mouse click,
    doInteractEvent();
  }, false );
  canvas_window_element.addEventListener( 'mousemove', (evt) => {
    // The position,
    // NOTE: Is this compatible across all browsers? It should be.
    // NOTE: This event isn't generated on mobile.
    doMouseMoveEvent(evt.offsetX, evt.offsetY);

  }, false );
  canvas_window_element.addEventListener( 'mouseenter', (evt) => {
    // The position,
    // NOTE: Is this compatible across all browsers? It should be.
    // NOTE: This event isn't generated on mobile.
    doMouseMoveEvent(evt.offsetX, evt.offsetY);
    
  }, false);
  canvas_window_element.addEventListener( 'mouseleave', (evt) => {
    // HACK; When mouse leaves the canvas we fire a single mouse
    //   move event at a coordinate outside the screen viewport.
    doMouseMoveEvent(-5, -5);
    
  }, false);
  
  
  canvas_window_element.addEventListener( 'keydown', (evt) => {
    // On key press,
    doInteractEvent();
  }, true );
  
  // Called when the user actives a generic 'interact' event. The user
  // clicked or pressed a key when the canvas has focus and modal capture
  // is not currently active.
  function doInteractEvent() {
    // If there are any interact callbacks, then call them now,
    if (interact_callback !== void 0) {
      const callback = interact_callback;
      interact_callback = void 0;
      callback();
    }
  };

  function containsSameTarget(a, arr, len) {
    for (let n = 0; n < len; ++n) {
      if (a.target === arr[n].target) {
        return true;
      }
    }
    return false;
  }

  // Called when the user moves the mouse cursor around the screen. The
  // given coordinates are raw coordinates and need to divided by the
  // screen scale to be put into local space.
  function doMouseMoveEvent(x, y) {
    const rx = x / overall_scale;
    const ry = y / overall_scale;

    // Is there a hit box group registered with this screen?
    const hg_len = hit_group_stack.length;
    if (hg_len > 0) {
      const cur_hit_group = hit_group_stack[hg_len - 1];

      const areas_active = [];

      const hit_areas = cur_hit_group.hit_areas;
      for (const hit_key in hit_areas) {
        const hit_area = hit_areas[hit_key];
        const polygon = hit_area.polygon;
        if (isInsidePolygon([ rx, ry ], polygon)) {
          // Hit!
          areas_active.push( { target:hit_key, hit_area:hit_area } );
        }
      }

      // Any changes from the current hovered areas?
      const active_count = areas_active.length;
      const cur_count = current_hovered_areas.length;
      let hovered_changed = false;

      for (let i = 0; i < active_count; ++i) {
        const area = areas_active[i];
        if (!containsSameTarget(area, current_hovered_areas, cur_count)) {
          // When an active area is not in the current hovered areas list,
          eventer.emit('mouseEnter', area);
          hovered_changed = true;
        }
      }
      for (let i = 0; i < cur_count; ++i) {
        const area = current_hovered_areas[i];
        if (!containsSameTarget(area, areas_active, active_count)) {
          // When a hovered area is not in the active list,
          eventer.emit('mouseLeave', area);
          hovered_changed = true;
        }
      }

      // Update if changed,
      if (hovered_changed) {
        current_hovered_areas = areas_active;
      }

    }

  };

  // API function; On interact event calls the given 'callback' function.
  function setInteractCallback(callback) {
    const lcb = () => {
      // Any active interpolations are completed,
      completeAllInterpolations();
      callback();
    };
    interact_callback = lcb;
  };

  // API function; On interact event calls the given 'callback' function or
  //   calls it after the given timeout (in seconds) has passed.
  function setInteractOrWaitCallback(seconds_wait, callback) {
    let callback_called = false;
    const lcb = () => {
      if (!callback_called) {
        // Any active interpolations are completed,
        completeAllInterpolations();
        callback_called = true;
        callback();
      }
    };
    
    // Either the callback happens on interaction, or the timeout
    // causes it.
    setTimeout( lcb, (seconds_wait * 1000) );
    interact_callback = lcb;
  };

  // API function; Calls the given 'callback' function after the given timeout
  //   (in seconds) has passed.
  function setWaitCallback(seconds_wait, callback) {
    const lcb = () => {
      // Any active interpolations are completed,
      completeAllInterpolations();
      callback();
    };
    setTimeout( lcb, (seconds_wait * 1000) );
  }

  function resetTransform(ctx) {
    ctx.globalAlpha = 1.0;
    ctx.resetTransform();
    ctx.scale(overall_scale, overall_scale);
  };

  function resetToRawTransform(ctx) {
    ctx.globalAlpha = 1.0;
    ctx.resetTransform();
  };

  function get2DContext() {
    return canvas_2dctx;
  };

  // Returns a time framestamp that represents a time frame of reference for a frame that
  // would start now. This value is reset in the next draw call. This is necessary so that
  // grouped elements that start animating at the same time are synchronized correctly and
  // not offset by the few microseconds it takes to set up the animations.
  function getTimeFramestampNow() {
    if (!time_framestamp_valid) {
      time_framestamp_valid = true;
      cur_time_framestamp = performance.now();
    }
    return cur_time_framestamp;
  };
  

  // Paints the view layer,
  function paintViewLayer(ctx, time, force_repaint) {

    // Interpolate all elements,
    // NOTE; This provides us details about where the element was and where
    //  it's going between frames.
    const ai_len = active_interpolations.length;

    active_interpolations.forEach((ai) => {
      ai.interpolate(time);
    });

    // Make sure the elements are sorted by depth, and add order.
    // NOTE; This must happen after the animation interpolations just in case
    //  the depth style key is changed,
    const len = canvas_elements.length;
    if (sort_depth_before_draw) {
      // Stable sort of canvas_elements by depth,
      canvas_elements.forEach( (ce, i) => { ce.sort_i = i } );
      canvas_elements.sort( (el1, el2) => {
        const c = el1.getStyles().depth - el2.getStyles().depth;
        if (c === 0) return el1.sort_i - el2.sort_i;
        return c;
      });
      sort_depth_before_draw = false;
    }

    // If there's at least one dirty canvas element then we redraw the
    // whole screen.

    let do_repaint = force_repaint;
    if (!force_repaint) {
      for (let i = 0; i < len; ++i) {
        const el = canvas_elements[i];
        if (el.isDirty()) {
          do_repaint = true;
          break;
        }
      }
    }

    if (do_repaint) {

      // PENDING: Should we clear the background here? If we don't clear by
      //   default then it introduces some weird screen artifacts if the canvas
      //   is not completely painted every frame.

      for (let i = 0; i < len; ++i) {
        const el = canvas_elements[i];
        el.resetDirty();
        const cstyle = el.getStyles();
        // Do we draw the element?
        if (cstyle.alpha > 0) {
          // Yup,
          // Translate the context to the element midpoint,
          resetTransform(ctx);
          ctx.translate(cstyle.x, cstyle.y);
          ctx.rotate(cstyle.rotation);
          ctx.scale(cstyle.scale_x, cstyle.scale_y);
          ctx.globalAlpha = cstyle.alpha;
          // Then call the draw function,
          el.draw(ctx, time, out_vnscreen);
        }
      }

    }

  };

  
  
  // Called each refresh. This will look at any visual events that are in the queue and
  // paint the canvas as appropriate.
  function drawCall(time) {

    time_framestamp_valid = false;

    // This is the render pipeline.

    // Now check for active animations,
    // PERFORMANCE; Defer this check every 'n' draw calls if this becomes a
    //    performance issue?
    // SIDE EFFECT; This also clears up on/off animation style object,
    let repaint_from_animations = false;
    const ce_length = canvas_elements.length;
    for (const n = 0; n < ce_length; ++n) {
      const ce = canvas_elements[n];
      // Does this element have an animation definition?
      if (ce.animation_defs !== void 0) {
        // Yes,
        // Is it visible and does it have an active animation style?
        const adefs = ce.animation_defs;
        for (const anim_style_name in adefs) {
          const def = adefs[anim_style_name];
          const astyle_object = ce.getStyle(anim_style_name);
          if (astyle_object !== void 0) {
            // If 'astyle_object' has empty 'effects' then anim not active,
            if (astyle_object.effects.length !== 0) {
              // There's an 'on' entry, so this guarentees that the next
              // frame must be painted,
              const effects = astyle_object.effects;
              const last_effect = effects[effects.length - 1];
              if (last_effect.type === 'off') {
                // Ok, if we have an 'off' time and we are past the animation timeout,
                const last_off_time = last_effect.time;
                if ( last_off_time + (def.off_time * 1000) < time ) {
                  // Ok, we can clear up here - but we still need to repaint this
                  // frame,
                  astyle_object.effects = [];
//                  console.log("CLEAR UP ANIMATION: ", def);
                }
              }
              ce.setDirty();
              repaint_from_animations = true;
            }
          }
        }
      }
    }

    // Exit early if a repaint isn't forced, there's no interpolation anims pending,
    // and the text trail hasn't advanced,
    if (!frame_needs_repaint &&
        active_interpolations.length === 0 &&
        !repaint_from_animations) {

      // Request again for the next frame,
      window.requestAnimationFrame(drawCall);
      return;

    }
    
    // If 'force_repaint' is true then we do a full repaint,
    const force_repaint = frame_needs_repaint;

    // Reset the 'repaint' flag,
    frame_needs_repaint = false;

    // Start painting,
    canvas_2dctx.save();
    try {
      paintViewLayer(canvas_2dctx, time, force_repaint);
    }
    catch (e) {
      throw e;
    }
    finally {
      canvas_2dctx.restore();
      // Request draw call again on the next frame,
      window.requestAnimationFrame(drawCall);
    }

  };
  
  // Start the requestAnimationFrame draw call chain,
  window.requestAnimationFrame(drawCall);
  
  
  
  
  // ----- Init -----
  
  // This function preloads the default font. This is necessary so text measurements can be
  // accurately discovered before rendering.
  // Best attempt to call 'cb' when the fonts are loaded.
  function preloadFont(font_family, cb) {

    // A canvas element we use for font metrics
    const ctx = document.createElement('canvas').getContext('2d');
    const styles = ['', 'italic ', 'bold ', 'italic bold '];
    
    styles.forEach( (style) => {
      ctx.font = style + '10px ' + font_family;
      const m = ctx.measureText('Hello');
      console.log('PRELOAD ', ctx.font);
    });

    // HACK: We need to find a way to listen for the event of a font being loaded.
    //   There may be some sort of CSS .display hack to do this.
    //   At the moment we just wait a reasonable time for the font to load.
    setTimeout( () => {
      cb( null, { status:'fontloaded' } );
    }, 500);

  };

  // ----- Functions -----
  
  // Creates a 'canvas' off-screen buffer with the given width and height.
  // The returned buffer object is scaled depending on the overall scaling
  // amount.
  function createBufferCanvas(width, height) {
    const buffer = document.createElement('canvas');
    buffer.width = Math.ceil(width * overall_scale);
    buffer.height = Math.ceil(height * overall_scale);
    return buffer;
  };
  
  // Paints a BufferCanvas to the screen. Any transforms specified in 'canvas_element'
  // are applied before drawing the buffer. Note that this function attempts to align
  // canvas against the raw pixel alignment.
  function paintBufferCanvas(ctx, canvas, ce) {
    // Reset to the raw scaling of the input context,
    resetToRawTransform(ctx);
    
    const cstyle = ce.getStyles();
    
    // If there's no rotation or scaling then we align the translation to the
    // floor'd pixel value. This prevents the buffer draw being alias'd
    if (cstyle.rotation === 0 && cstyle.scale_x === 1 && cstyle.scale_y === 1) {
      // Translate to the midpoint,
      ctx.translate( ~~(cstyle.x * overall_scale),
                     ~~(cstyle.y * overall_scale) );
      ctx.globalAlpha = cstyle.alpha;
      // Draw the buffer,
      ctx.drawImage(canvas,
                    ~~(-(canvas.width / 2)),
                    ~~(-(canvas.height / 2)) );
    }
    else {
      // Translate to the midpoint,
      ctx.translate( (cstyle.x * overall_scale),
                     (cstyle.y * overall_scale) );
      ctx.rotate( cstyle.rotation );
      ctx.scale( cstyle.scale_x, cstyle.scale_y );
      ctx.globalAlpha = cstyle.alpha;
      // Draw the buffer,
      ctx.drawImage(canvas,
                    (-(canvas.width / 2)),
                    (-(canvas.height / 2)) );
    }
    
  };
  
  
  
  // Returns a dialog text trail formatter for the dialog bar.
  function getDialogTextTrailFormatter() {
    return dialog_text_formatter;
  };




  
  // Returns the image with the given id. The image must have been successfully
  // loaded.
  function getImage(img_id) {
    return images_map[img_id];
  };
  
  // Loads a set of image resources from URLs. When all the images in the set are
  // successfully loaded 'onload_cb' is called.
  //   img_set = [ { id:'', url:'' }, {}, ... ]
  function loadImages(img_set, onload_cb) {
    
    let completed = 0;
    const errors = [];
    function complete(id, img_url, img_el, valid) {
      if (valid) {
        // Update the image DB,
        images_map[id] = img_el;
      }
      else {
        // Oops, failed to load this image,
        errors.push( { id, error:'Failed to load image: ' + img_url} );
      }
      
      console.log("LOADED:", img_url);
      
      // Callback on complete,
      ++completed;
      if (completed == img_set.length) {
        onload_cb(errors);
      }
    };

    // For each image being loaded,
    img_set.forEach( (imgv) => {
      const { id, url } = imgv;

      // Is the image already in the map?
      const from_map = images_map[id];
      if (from_map) {
        complete(id, url, from_map, true);
      }

      // Load the image,
      const img_el = new Image();
      img_el.addEventListener('load', function() {
        complete(id, url, img_el, true);
      });
      img_el.addEventListener('error', function() {
        complete(id, url, null, false);
      }, false);

      img_el.src = url;
    });

  };
  
  
  function repaint() {
    frame_needs_repaint = true;
  };
  
  // ----- Text displays -----

  // Starts drawing the given text in the dialog area. If the dialog area is
  // currently not displaying then it is shown.
  function printDialogText(source_name, text) {
    if (isUndefined(text)) {
      text = source_name;
      source_name = null;
    }
    // Measure the text and layout over the config rectangle,
    dialog_text_trail.measureAndLayoutText(text);
    dialog_text_trail.resetAnimationPoint();
  };

  // Clears the current dialog text,
  function clearDialogText() {
    dialog_text_trail.clearAnimation();
  };

  


  
  // ----- Transition animations -----

  function completeAllInterpolations() {
    active_interpolations.forEach( (i) => {
      i.complete();
    });
    active_interpolations.length = 0;
    frame_needs_repaint = true;
  };
  
  function addInterpolation(i, ms_to) {
    // On timeout then set interpolation final result,
    const timeout_function = function() {
      // Final result interpolation,
      active_interpolations.find( (ai, n) => {
        if (ai === i) {
          active_interpolations.splice(n, 1);
          i.complete();
//          console.log('Complete Interpolation', i);
          frame_needs_repaint = true;
          return true;
        }
      });
    };
    i.timeout_function = timeout_function;
    active_interpolations.push(i);
    setTimeout(timeout_function, ms_to);
//    console.log('Add Interpolation:', i);
//    console.log('', canvas_elements);
  };





  // ----- Support classes -----


  function notifyDoSortDepthBeforeDraw() {
    sort_depth_before_draw = true;
  };

  // Adds a canvas element to the list of canvas elements being drawn on the screen,
  function addCanvasElement(ce) {
    canvas_elements.push(ce);
    notifyDoSortDepthBeforeDraw();
    // Force full repaint when we add and remove canvas elements,
    repaint();
    return ce;
  };

  // Creates a new canvas element and adds it to the list of all elements currently
  // active on the current canvas.
  function createCanvasElement() {
    return addCanvasElement( CanvasElement() );
  };

  const NOOP_DRAW = function(ctx, vnscreen) { };

  function createPaintingCanvasElement(width, height) {
    const el = createCanvasElement();
    el.type = 'PAINTING';
    el.setRawStyles( {
      width,
      height,
    } );
    el.draw = NOOP_DRAW;
    return el;
  };
  
//  // Create a static image canvas element.
//  function createStaticImageCanvasElement(img_id) {
//    const el = createCanvasElement();
//    el.type = 'STATIC';
//    el.img_id = img_id;
//    const img_obj = images_map[img_id];
//    el.img_obj = img_obj;
//    el.width = img_obj.width;
//    el.height = img_obj.height;
//    el.mid_x = el.width / 2;
//    el.mid_y = el.height / 2;
//    el.draw = function(ctx) {
//      ctx.rotate(el.rotation);
//      if (el.noScaleFactor) {
//        // No scale factor on this image,
//      }
//      else {
//        ctx.scale(scaling_factor, scaling_factor);
//      }
//      ctx.drawImage(el.img_obj, -el.mid_x, -el.mid_y);
//    };
//    return el;
//  };

  function pushHitGroup(hit_group) {
    hit_group_stack.push(hit_group);
  };
  
  function popHitGroup() {
    return hit_group_stack.pop();
  };



  function dumpDebug(output) {
    output.push(canvas_elements);
  }
  
  


  // Public API,
  out_vnscreen = {

    setInteractCallback,
    setInteractOrWaitCallback,
    setWaitCallback,
    getTimeFramestampNow,

    get2DContext,
    preloadFont,
    getDialogTextTrailFormatter,
    getImage,
    loadImages,
    repaint,
    
    resetTransform,
    createBufferCanvas,
    paintBufferCanvas,

    printDialogText,
    clearDialogText,

    addInterpolation,
    notifyDoSortDepthBeforeDraw,
    addCanvasElement,
    createCanvasElement,
    createPaintingCanvasElement,
//    createStaticImageCanvasElement,

    pushHitGroup,
    popHitGroup,

    addListener: eventer.addListener.bind(eventer),
    removeListener: eventer.removeListener.bind(eventer),

    dumpDebug,

  };
  return out_vnscreen;

};





exports.VNScreen = VNScreen;
