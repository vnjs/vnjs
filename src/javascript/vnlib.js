"use strict";

import { isUndefined, mergeConfig, polyfill2DCanvas, Rectangle } from './utils';

import TextFormatter from './TextFormatter';
import CanvasElement from './CanvasElement';
import TextTrail     from './TextTrail';

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

  // For a shadow effect around the text.
  // Fast on Chrome and Edge. Slow on other browsers.
  text_shadow: true,
  enable_dirty_clipping: false,
  ms_per_word: 25,

  default_font_family: 'Montserrat, sans-serif',
  default_font_size: '25px',
  default_font_color: '#fffff0',

  pixels_between_words: 7,
  line_height: 30,
  
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
  
  // The VNScreen object output,
  let out_vnscreen;

  const overall_scale = canvas_window_element.height / 720;

  // The height of the text trail buffer.
  const TEXT_TRAIL_BUFFER_HEIGHT = 200;

  // The current set of active elements to draw on the canvas, sorted by z depth.
  const canvas_elements = [];
  
  // When this is set to true, the canvas elements are sorted by depth on the
  // next draw call.
  let sort_depth_before_draw = false;
  
  // The action queue is a list of animation actions to perform on elements on the
  // canvas.
  const active_interpolations = [];

  // The set of active text trails currently running,
  const active_text_trails = [];
  
  // True when the dialog text trail is being displayed,
  let is_displaying_dialog_trail = false;

  
  
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
  canvas_window_element.addEventListener( 'mouseup', (evt) => {
    // On mouse up,
    doInteractEvent();
  }, false );
  
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
  function paintViewLayer(ctx, time, dirty_areas) {

    // Interpolate all elements,
    // Note; this provides us details about where the element was and where
    //  it's going between frames.
    const ai_len = active_interpolations.length;
    
    const ENABLE_DIRTY_CLIPPING = config.enable_dirty_clipping;
    
    active_interpolations.forEach((ai) => {
      if (ENABLE_DIRTY_CLIPPING) dirty_areas.push(ai.canvas_element.getBounds());
      ai.interpolate(time);
      if (ENABLE_DIRTY_CLIPPING) dirty_areas.push(ai.canvas_element.getBounds());
    });
    
    if (ENABLE_DIRTY_CLIPPING) {
      // Clear the canvas,
      resetToRawTransform(ctx);
      // Clip,
      ctx.beginPath();

      dirty_areas.forEach((r) => {
        ctx.rect(Math.floor(r.x * overall_scale), Math.floor(r.y * overall_scale),
                            Math.ceil(r.wid * overall_scale), Math.ceil(r.hei * overall_scale));
      });

      ctx.clip();
      ctx.closePath();
    }

    // Background image
    // PENDING: For performance, we should be able to turn the painting of this
    //   off.
    resetTransform(ctx);
    // Fill the buffer with transparency squares,
    ctx.fillStyle = 'hsl(220, 0%, 96%)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'hsl(220, 0%, 89%)';
    const SQUARE_SIZE = 64;
    for (let ty = -1; ty < (720 / SQUARE_SIZE); ++ty) {
      for (let tx = 0; tx < (1280 / SQUARE_SIZE); ++tx) {
        if (((tx + ty) & 0x01) === 0) {
          ctx.fillRect(tx * SQUARE_SIZE, (ty * SQUARE_SIZE) + 8, SQUARE_SIZE, SQUARE_SIZE);
        }
      }
    }

    // Make sure the elements are sorted by depth, and add order,
    const len = canvas_elements.length;
    if (sort_depth_before_draw) {
      // Stable sort of canvas_elements by depth,
      canvas_elements.forEach( (ce, i) => { ce.sort_i = i } );
      canvas_elements.sort( (el1, el2) => {
        const c = el1.depth - el2.depth;
        if (c === 0) return el1.sort_i - el2.sort_i;
        return c;
      });
      sort_depth_before_draw = false;
    }

    for (let i = 0; i < len; ++i) {
      const el = canvas_elements[i];
      // Do we draw the element?
      if (el.alpha > 0) {
        // Yup,
        // Translate the context to the element midpoint,
        resetTransform(ctx);
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rotation);
        ctx.scale(el.scale_x, el.scale_y);
        ctx.globalAlpha = el.alpha;
        // Then call the draw function,
        el.draw(ctx, out_vnscreen);
      }
    }
    
  };

  
  
  // Called each refresh. This will look at any visual events that are in the queue and
  // paint the canvas as appropriate.
  function drawCall(time) {

    time_framestamp_valid = false;
  
    // This is the render pipeline.
  
    // Exit early if a repaint isn't forced, there's no interpolation anims pending,
    // and the text trail hasn't advanced,
    if (!frame_needs_repaint &&
        active_interpolations.length === 0) {
      // Request again for the next frame,
      window.requestAnimationFrame(drawCall);
      return;
    }
    
    // Dirty areas that need to be repainted,
    const dirty_areas = [];

    // If 'force_repaint' is true then we do a full repaint,
    const force_repaint = frame_needs_repaint;

    // Reset the 'repaint' flag,
    frame_needs_repaint = false;

    // Start painting,
    canvas_2dctx.save();
    try {

      if (config.enable_dirty_clipping) {
        if (force_repaint) {
          dirty_areas.push( Rectangle(0, 0, 1280, 720) );
        }
//        if (repaint_for_text_trail) {
//          // The text trial area needs repainting,
//          dirty_areas.push( Rectangle(diag_x, diag_y, diag_width, diag_height) );
//        }
        // Paint the view layer,
        if (active_interpolations.length != 0 || dirty_areas.length > 0) {
          paintViewLayer(canvas_2dctx, time, dirty_areas);
        }
      }
      else {
        paintViewLayer(canvas_2dctx, time, dirty_areas);
      }

    }
    catch (e) {
      console.log(e);
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
    
    // If there's no rotation or scaling then we align the translation to the
    // floor'd pixel value. This prevents the buffer draw being alias'd
    if (ce.rotation === 0 && ce.scale_x === 1 && ce.scale_y === 1) {
      // Translate to the midpoint,
      ctx.translate( ~~(ce.x * overall_scale),
                     ~~(ce.y * overall_scale) );
      ctx.globalAlpha = ce.alpha;
      // Draw the buffer,
      ctx.drawImage(canvas,
                    ~~(-(canvas.width / 2)),
                    ~~(-(canvas.height / 2)) );
    }
    else {
      // Translate to the midpoint,
      ctx.translate( (ce.x * overall_scale),
                     (ce.y * overall_scale) );
      ctx.rotate( ce.rotation );
      ctx.scale( ce.scale_x, ce.scale_y );
      ctx.globalAlpha = ce.alpha;
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
    el.width = width;
    el.height = height;
    el.mid_x = width / 2;
    el.mid_y = height / 2;
    el.draw = NOOP_DRAW;
    return el;
  };
  
  // Create a static image canvas element.
  function createStaticImageCanvasElement(img_id) {
    const el = createCanvasElement();
    el.type = 'STATIC';
    el.img_id = img_id;
    const img_obj = images_map[img_id];
    el.img_obj = img_obj;
    el.width = img_obj.width;
    el.height = img_obj.height;
    el.mid_x = el.width / 2;
    el.mid_y = el.height / 2;
    el.draw = function(ctx) {
      ctx.rotate(el.rotation);
      if (el.noScaleFactor) {
        // No scale factor on this image,
      }
      else {
        ctx.scale(scaling_factor, scaling_factor);
      }
      ctx.drawImage(el.img_obj, -el.mid_x, -el.mid_y);
    };
    return el;
  };
  
  
  


  // Public API,
  out_vnscreen = {

    setInteractCallback,
    setInteractOrWaitCallback,
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
    createStaticImageCanvasElement,

  };
  return out_vnscreen;

};






export default VNScreen;
