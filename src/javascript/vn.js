"use strict";

// External libs,  
const VNScreen = require('./vnlib').VNScreen;
const { roundedRect, roundedShadowedRect } = require('./graphics');
const { loadFile, mergeConfig } = require('./utils');

// We use 'require' for import here so that these libraries also work in node.js
const SceneComposer = require('./SceneComposer').SceneComposer;
const Context = require('./Context').Context;
const Interpreter = require('./Interpreter').Interpreter;
const TextTrail = require('./TextTrail').TextTrail;
const TextFormatter = require('./TextFormatter').TextFormatter;

// Is this self-invoking function necessary with the babel transform?
(function() {

const handleCriticalError = (msg, args) => {
  console.log("Stopped because of critical error(s):", args);
};

// Find the right method, call on correct element
const launchIntoFullscreen = (element) => {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  }
  else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  }
  else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  }
  else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  }
  else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  }
  else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}


// Event for when the document is loaded,
// ISSUE: Does this work on all browsers that support HTML5 Canvas?
document.addEventListener('DOMContentLoaded', () => {
  
  const main_div = document.getElementById("main");
  
  const btn = document.createElement('button');
  btn.innerHTML = 'Launch Game Fullscreen (Recommended for Mobile)';
  const btn2 = document.createElement('button');
  btn2.innerHTML = 'Launch Game Windowed';
  
  btn.addEventListener('click', () => {
    console.log("LAUNCH THE GAME!");
    launchIntoFullscreen(document.documentElement);
    gameLaunch();
  }, false);
  
  btn2.addEventListener('click', () => {
    console.log("LAUNCH THE GAME!");
    gameLaunch();
  }, false);

  main_div.appendChild(document.createElement('br'));
  main_div.appendChild(btn);
  main_div.appendChild(document.createElement('br'));
  main_div.appendChild(document.createElement('br'));
  main_div.appendChild(btn2);

});



function loadAndParseScene(filenames, callback) {

  // Load a .vnjs file using the web Javascript API,
  function sourceLoader(filename, cb) {

    const resolvedfn = 'scripts/' + filename;
    loadFile(resolvedfn, function(status) {
      if (status.fail) {
        cb(status.fail);
      }
      else {
        const data = status.req.responseText;
        cb(null, data);
      }
    })

  };

  // Create a composer,
  const composer = SceneComposer();
  // Compile the scenes,
  composer.prepareCodebase(
          sourceLoader, filenames, function(err, parsed_vn) {

    if (err) {
      // PENDING: Handle error here,
      throw err;
//      console.error(err);
    }
    else {
      callback(parsed_vn);
    }

  });

}





function FrontEnd() {
  
  // All the system calls,
  const system_calls = {};

  // The context.system object,
  const context_system = {};

  // The public global variables object,
  const global_vars = {};

  // The public constant variables given by the backend,
  const constant_vars = {};
  // The public constant variable definitions given by the backend,
  const constant_var_defs = {};
  
  // The compiled functions given us by the backend,
  const function_load_map = {};

  let vn_screen;
  let display_canvas;
  const config = {};

  // Map of all text trails currently available,
  let text_trail_element_map = { };

  
  function resolveConstant(ident) {
    let constant_v = constant_vars[ident];
    if (constant_v === void 0) {
      // Construct the constant variable,
      const constant_v_def = constant_var_defs[ident];
      constant_v = constructConstantDef(ident, constant_v_def);
//      console.log("CREATED CONSTANT: ", ident, "=", constant_v, "(", typeof constant_v, ")");
    }
    return constant_v;
  }
  
  const property_resolver = {
    getV: function(ident) {
      // Is it a constant?
      if (ident in constant_var_defs) {
        return resolveConstant(ident);
      }
      else {
        return global_vars[ident];
      }
    }
  };

  function createConstantsResolver(resolveConstant) {
    return {
      getV: function(ident) {
        // Is it a constant?
        if (ident in constant_var_defs) {
          return resolveConstant(ident);
        }
        else {
          throw Error('Constant not found: ' + ident);
        }
      }
    }
  }
  
  const constants_resolver = createConstantsResolver(resolveConstant);

  // Returns a JavaScript typed value given the value from the
  // back end.
  function toValue(vob) {
    if (vob.v !== void 0) {
      return vob.v;
    }
    else {
      const res = function_load_map[vob.f](property_resolver);
      // Process the result. If an object is returned then handle specially,
      if (typeof res === 'object') {
        if (res.type === 'c') {
          return res.obj;
        }
        else if (res.type === 'd') {
          const extrap_fun = res.func;
          return extrap_fun.call(null, constants_resolver);
        }
        else if (res.type === 'i') {
          // The constants this inline function is permitted to access,
          const constants_access = res.constants_access;
          // The function to call,
          const call_fun = res.func;
          // If there's no access to constants allowed then just return the
          // function,
          if (constants_access.length === 0) {
            return call_fun;
          }
          // Otherwise wrap the function,
          else {
            return function() {
              // Look at arg '1' and if it's an instance of UContext then
              // pass it the constants access object,
              const arg1 = arguments[1];
              if (arg1 !== void 0 && arg1 instanceof UContext) {
                arg1.allowAccess(constants_access);
              }
              return call_fun.apply(null, arguments);
            }
          }
        }
        else {
          throw Error('Unknown result type: ' + res.type);
        }
      }
      return res;
    }
  }

  // Resolve the function parameters,
  function toJSParameterMap(params) {
    const out = {};
    for (let ident in params) {
      out[ident] = toValue(params[ident]);
    }
    return out;
  }
  
  // Creates an object from the given constructor name.
  function constantConstruction(name, params) {
    // Look up the constructor object,
    if (!(name in constant_var_defs)) {
      throw Error('Constant not found: ' + name);
    }
    // Resolve the constructor function,
    let constructor_fun = resolveConstant(name);
    // Dynamic function,
    let src_loc = constructor_fun.src_loc;
    if (constructor_fun.type === 'd') {
      // This must resolve to an inline function,
      constructor_fun = constructor_fun.func.call(null, constants_resolver);
    }
    if (constructor_fun.type !== 'i') {
      throw Error(
          'Expect an inline constructor function; ' +
          src_loc.source_file + ":" + src_loc.line + ":" + src_loc.column);
    }
    // The constructor function to call,
    const javascript_fun = constructor_fun.func;
    
    // Call the user code to construct the object,
    const out = callUserCode(javascript_fun, params);

    // NOTE: Little bit of magic here. We set the 'ob' field to the constructor
    // name. This is so we know how to reconstruct this object across instances.
    out.ob = name;

    return out;
  }
  
  function constructConstantDef(ident, def) {
    
    const fdef = def[0];
    const type = fdef[0];
    let constant_ob;
    // Static value,
    if (type === 'v') {
      constant_ob = fdef[1];
    }
    // Dynamic value,
    else if (type === 'd') {
      const func_factory = eval.call(null, fdef[1]);
      constant_ob =
          { type:    'd',
            func:    func_factory,
            src_loc: fdef[2]
          };
    }
    // Inline JavaScript code and mutators,
    else if (type === 'i') {
      const func_factory = eval.call(null, fdef[1]);
      const constants_access = [];
      constant_ob =
          { type:     'i',
            func:     func_factory,
            constants_access,
            src_loc:  fdef[3]
          };
      for (let i = 1; i < def.length; ++i) {
        // Mutator functions,
        const mutator_name = def[i][1];
        const args = toJSParameterMap(def[i][2]);
        if (mutator_name === 'registerConstant') {
          // Register constant for this function to be able to access,
          constants_access.push(args['default']);
        }
        else {
          throw Error("Unknown inline mutator: " + mutator_name);
        }
      }
    }
    // Object constructor and mutators,
    else if (type === 'c') {
      const constant_fun_name = fdef[1];
      const constant_params = toJSParameterMap(fdef[2]);
      constant_ob =
          { type:    'c',
            obj:     constantConstruction(constant_fun_name, constant_params),
            src_loc: fdef[3]
          };
      for (let i = 1; i < def.length; ++i) {
        // Mutator functions,
        const mutator_name = def[i][1];
        const mutators = constant_ob.obj.mutators;
        let method_not_found = true;
        if (typeof mutators === 'object') {
          const fun = mutators[mutator_name];
          if (typeof fun === 'function') {
            method_not_found = false;
            fun(toJSParameterMap(def[i][2]));
          }
        }
        if (method_not_found) {
          throw Error("Method not found: " + constant_fun_name + "." + mutator_name);
        }
      }
    }
    else {
      throw Error(type);
    }

    constant_vars[ident] = constant_ob;
    return constant_ob;
  }
  
  function doProportional(desc, clos) {
    if (typeof desc === 'string') {
      desc = desc.trim();
      if (desc.length > 1) {
        const len = desc.length;
        if (desc.charAt(len - 1) === '%') {
          return clos(parseFloat(desc.substring(0, len - 1)));
        }
      }
    }
    return desc;
  }

  // Returns radians of either a string '[num]deg' or a number (as radians).
  function convertRotational(v) {
    if (typeof v === 'string') {
      v = v.trim();
      if (v.length > 3) {
        const len = v.length;
        const ty = v.substring(len - 3, len);
        if (ty === 'deg') {
          const degrees = parseFloat( v.substring(0, len - 3) );
          return (degrees * (Math.PI / 180));
        }
        else if (ty === 'rad') {
          return parseFloat(v.substring(0, len - 3));
        }
      }
    }
    return v;
  }

  
  // Converts the input styles into a raw format (converts degrees to radians,
  // proportional positioning, etc)
  function convertToRawStyles(styles, ignore_keys) {
    const raw_out = {};
    for (let sk in styles) {
      if (ignore_keys !== void 0 && ignore_keys[sk]) {
        continue;
      }
      const style = styles[sk];
      switch(sk) {
//        case 'alpha':
//          raw_out.alpha = style;
//          break;
        case 'rotation':
          raw_out.rotation = convertRotational(style);
          break;
        case 'x':
          // PENDING: Deal with multi-orientation display dimensions,
          const xval = doProportional(style, (percent) => {
            return 1280 * (percent / 100);
          });
          raw_out.x = xval;
          break;
        case 'y':
          // PENDING: Deal with multi-orientation display dimensions,
          const yval = doProportional(style, (percent) => {
            return 720 * (percent / 100);
          });
          raw_out.y = yval;
          break;
        case 'scale_x':
          const sx = doProportional(style, (percent) => {
            return (percent / 100);
          });
          raw_out.scale_x = sx;
          break;
        case 'scale_y':
          const sy = doProportional(style, (percent) => {
            return (percent / 100);
          });
          raw_out.scale_y = sy;
          break;

        default:
          raw_out[sk] = style;
      }
    }
    return raw_out;
  }


  function setElementStyle(out, styles, ignore_keys) {
    // Convert the styles to a raw format,
    const raw_styles = convertToRawStyles(styles, ignore_keys);
    // Move the styles (in specified format) to 'out.args'
    for (let sk in styles) {
      if (!ignore_keys[sk]) {
        const style = styles[sk];
        out.args[sk] = style;
      }
    }
    // Move the styles to the canvas element,
    out.el.setRawStyles(raw_styles);
  }

  
  function copyFields(to_obj, from_obj) {
    for (let f in from_obj) {
      if (f !== 'default') {
        to_obj[f] = from_obj[f];
      }
    }
    return to_obj;
  }


  function Interpolation(type, ms_to, canvas_element) {
    let time_start = vn_screen.getTimeFramestampNow();
    return {
      type,
      time_start,
      ms_to,
      canvas_element
    };
  };

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
    // NOTE: duck typing,
    if (typeof easing === 'function') {
      return easing(t, b, c, d);
    }
    // Assume string,
    else {
      switch (easing) {
        case 'no-ease':
          return noEasing(t, d, b, c);
        case 'ease-out':
          return easeOut(t, d, b, c);
        case 'ease-in':
          return easeIn(t, d, b, c);
        default:
          throw new Error('Unknown easing: ' + easing);
      }
    }
  };


  // Works out the animation interpolation of transitioning from the element's
  // current style to the styles specified by 'target_styles'. The animation lasts
  // for 'time' seconds and uses the given easing function.
  function addInterpolations(el, target_styles, time, easing) {
    
//    console.log("ANIMATE:", el, target_styles, time, easing);
    
    if (easing === void 0) {
      easing = 'no-ease';
    }

    // Record the applicable current state of the element,
    const cur_styles = {};
    for (let k in target_styles) {
      cur_styles[k] = el[k];
    }

    const ms_to = time * 1000;
    const i = Interpolation('styles', ms_to, el);
    i.interpolate = function(ts) {
      for (let k in target_styles) {
        const from_v = cur_styles[k];
        const to_v = target_styles[k];
        const ts_av = easingFunction(
                          easing, ts - i.time_start, ms_to, from_v, to_v - from_v);
        el[k] = ts_av;
      }
    };
    i.complete = function() {
      el.setRawStyles(target_styles);
    };

    vn_screen.addInterpolation(i, ms_to);

  }

  function setROProp(obj, key, val) {
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      writable: false,
      value: val
    });
  }

  // Instances of this class are passed to user functions when executed. The object
  // provides access to the context in general,
  function UContext() {
  }
  setROProp(UContext.prototype, 'setTargetStyle', function( canvas_element, style ) {
    canvas_element.target_style = convertToRawStyles( style );
  });;
  setROProp(UContext.prototype, 'animate', function( canvas_element, anim_args ) {
    const { easing, time } = anim_args;
    addInterpolations(
            canvas_element.el, canvas_element.target_style, time, easing);
  });;
  setROProp(UContext.prototype, 'system', context_system);
  setROProp(UContext.prototype, 'createDrawCanvasElement', createDrawCanvasElement);
  setROProp(UContext.prototype, 'lib', {
    TextFormatter,
    TextTrail,
    graphics: { roundedRect }
  });

  // Calls a user code function. The creates a context and executes the function.
  function callUserCode(func, args) {

    const context = new UContext();
    let tc_valid_objects;

    context.allowAccess = function(valid_objects) {
      if (tc_valid_objects === void 0) {
        tc_valid_objects = valid_objects;
      }
      else {
        throw Error("Permission denied");
      }
    };
    context.getConstant = function(constant_name) {
      // Fetch the value of the constant,
      const cvar = constant_vars[constant_name];
      // Check the user code allows access to this constant,
      if (cvar !== void 0) {
        // The object to test the constant against,
        let test_obj;
        if (typeof cvar === 'object') {
          if (cvar.type === 'i') {
            test_obj = cvar.func;
          }
          else if (cvar.type === 'c') {
            test_obj = cvar.obj;
          }
        }
        else {
          test_obj = cvar;
        }
        
        // For each valid object,
        for (let i = 0; i < tc_valid_objects.length; ++i) {
          // If it matches the object we accessed then permission granted,
          if (test_obj === tc_valid_objects[i]) {
            return test_obj;
          }
        }
      }
      throw Error('Access to ' + constant_name + ' not permitted');
    };

    return func.call(null, args, context);

  }
  
  // ----- JavaScript API -----
  
  // This is the context.createDrawCanvasElement function. It returns a CanvasElement
  // on which we can register a draw function to paint arbitrary graphics to. The
  // object returned can be safely returned by a VNJS constructor inline function.
  function createDrawCanvasElement(args, width, height) {
    const out = {
      args,
    };
    if (width === void 0) {
      width = 128;
    }
    if (height === void 0) {
      height = 128;
    }
    // Create the canvas element,
    const ce = vn_screen.createPaintingCanvasElement(width, height);
    out.el = ce;
    // Function to set the draw function,
    out.setDrawFunction = function(func) {
      ce.draw = func;
    }
    setElementStyle(out, args, { 'default':-1 } );
    return out;
  }

  // Sets a named text trail. Use a name of 'default' to set the default text
  // trail.
  function setTextTrail(name, text_trail, enter, exit) {
    if (text_trail === void 0 || text_trail.ob !== 'TextTrail') {
      throw Error('Assert failed: expecting a text trail object');
    }
    text_trail_element_map[name] = text_trail;
    // Register functions for displaying or removing the text trail,
    text_trail.enter_fun = enter;
    text_trail.exit_fun = exit;
    text_trail.displayed = false;
  }
  
  function getTextTrail(name) {
    return text_trail_element_map[name];
  }
  
  
  // ---- System API calls ----

  // Prints a debug message to console,
  system_calls.debug = function(args, cb) {
    console.log(args.default);
    cb();
  };
  system_calls.preloadAssets = function(args, cb) {
    const to_preload = args.default;
    console.log("PENDING: preloadAssets for: ", to_preload);
    cb();
  };
  
  
  // Set the default text trail (where announcements go)
  system_calls.setDefaultTextTrail = function(args, cb) {
    const text_trail = args.default;
    const enter = args.enter;
    const exit = args.exit;

    // Set the default text trail,
    setTextTrail('default', text_trail, enter, exit);
    cb();
  };
  
  // Sets a named text trail,
  system_calls.setTextTrail = function(args, cb) {
    const text_trail = args.default;
    const tt_name = args.name;
    const enter = args.enter;
    const exit = args.exit;
    
    setTextTrail(tt_name, text_trail, enter, exit);
    cb();
  };
  
  // Sets the style properties of a screen element,
  system_calls.setStyle = function(args, cb) {
    const element = args.default;
    
    setElementStyle(element, args, { 'default':-1 } );
    
    // Repaint the screen,
    vn_screen.repaint();

    cb();
  };

  // Sets the target style of the given element in the next 'animate' call,
  system_calls.setTargetStyle = function(args, cb) {
    const element = args.default;
    const target_style = convertToRawStyles(args, { 'default':-1 } );

    element.target_style = target_style;

    cb();
  };
  
  // Animate one or more style properties of an element,
  system_calls.animate = function(args, cb) {
    const element = args.default;
    const { time, easing } = args;

    addInterpolations(element.el, element.target_style, time, easing);

    cb();
  };
  
  // Announce text on the default text trail,
  system_calls.announce = function(args, cb) {
    const text = args.default;
    let trail_target = args.trail;
    // The target trail to make the announcement,
    if (trail_target === void 0) {
      trail_target = 'default';
    }
    // After, should we wait for interaction? (default: wait on interact)
    let until = args.until;
    let continueAfter = args.continueAfter;
    if (until === void 0) {
      until = 'interact';
    }
    else if (util === 'interactOrWait') {
      until = 'interact';
    }

    const text_trail = getTextTrail(trail_target);
    if (!text_trail.displayed) {
      text_trail.displayed = true;
      callUserCode(text_trail.enter_fun, {});
    }

    // Measure and format the text to be displayed,
    text_trail.el.resetAnimationPoint();
    text_trail.el.measureAndLayoutText(text);

    // How long will it take to display this layout?
    const time_to_complete = text_trail.el.getTotalTimeMS();

    // The interpolation target,
    text_trail.el.time = 0;
    const dstyle = { time: time_to_complete };
    // Start the animation interpolation,
    addInterpolations(text_trail.el, dstyle, time_to_complete / 1000, 'no-ease');

    // Do we wait on interact?
    if (until === 'interact') {
      const finish_cb = () => {
        // Clear the animation before we callback after interact,
        text_trail.el.clearAnimation();
        cb();
      };
      
      if (continueAfter === void 0) {
        vn_screen.setInteractCallback(finish_cb);
      }
      else {
        vn_screen.setInteractOrWaitCallback(continueAfter, finish_cb);
      }
    }
    // No, so continue to next instruction,
    else {
      cb();
    }

  };

  
  
  // Preloads fonts,
  system_calls.preloadFont = function(args, cb) {
    const font_family = args.default;
    vn_screen.preloadFont(font_family, cb);
  };


  // ---- Constructors ----

  // TextTrail object.
  const DEFAULT_TTRAIL_CONFIG = {
    font_family: 'sans-serif',
    font_size: '25px',
    font_color: '#ffffff',
    pixels_between_words: 7,
    line_height: 30
  };
  context_system.TextTrail = function(args) {
    let ttconfig = {};
//    if (args.font_family !== void 0) ttconfig.default_font_family = args.font_family;
//    if (args.font_size !== void 0) ttconfig.default_font_size = args.font_size;
//    if (args.font_color !== void 0) ttconfig.default_font_color = args.font_color;
    if (args.width !== void 0) ttconfig.buffer_width = args.width;
    if (args.height !== void 0) ttconfig.buffer_height = args.height;

    ttconfig = mergeConfig(ttconfig, args);
    ttconfig = mergeConfig(ttconfig, DEFAULT_TTRAIL_CONFIG);
    const text_trail = TextTrail(vn_screen, ttconfig);
    vn_screen.addCanvasElement(text_trail);

    const out = {
      args,
      el: text_trail,
    };

    // Set initial canvas style properties,
    setElementStyle(out, args,
        { buffer_width:-1, buffer_height:-1 } );
    return out;
  };

  // Linear gradient object.
  context_system.LinearGradient = function(args) {
    const out = {
      args,
    }
    const fill_style = vn_screen.get2DContext().createLinearGradient(
                          args.x1, args.y1, args.x2, args.y2);
    // Define the mutator,
    out.mutators = {
      addColorStop: function(args) {
        fill_style.addColorStop(args.stop, args.color);
      }
    };
    out.val = fill_style;
    return out;
  };

  // Radial gradient object.
  context_system.RadialGradient = function(args) {
    const out = {
      args,
    }
    const fill_style = vn_screen.get2DContext().createRadialGradient(
                          args.x1, args.y1, args.r1, args.x2, args.y2, args.r2);
    // Define the mutator,
    out.mutators = {
      addColorStop: function(args) {
        fill_style.addColorStop(args.stop, args.color);
      }
    };
    out.val = fill_style;
    return out;
  };

  
  
  
  // ---- System API calls ----
  
  // Initialize the context VNJS javascript API,
  function initialize(cb) {

    // Create the canvas element,
    const main_div = document.getElementById("main");

    // PENDING: Handle narrow and wide orientations and different aspect ratios,
    const std_wid = (1280 * 1).toFixed(0);
    const std_hei = (720  * 1).toFixed(0);
      
    // Make the canvas element,
    main_div.innerHTML = '<canvas id="vnBodyCanvas" tabindex="1" width="' + std_wid + '" height="' + std_hei + '" ></canvas>';

    display_canvas = document.getElementById("vnBodyCanvas");
    vn_screen = VNScreen(display_canvas, config);

    cb( null, { status:'initializeret' } );

  }
  
  function loadConstant(varname, fcode) {
    constant_var_defs[varname] = fcode;
  }
  
  function loadFunction(function_id, function_source_code) {
    const compiled_fun = eval(function_source_code);
    function_load_map[function_id] = compiled_fun;
  }

  function execAssign(ident, val) {
    // Assign the value in the global vars object,
    global_vars[ident] = val;
  }

  function execCall(ident, args, cb) {

    // Dispatch the command,
    
    // Is it a system API call?
    const syscall = system_calls[ident];
    const jsargs = toJSParameterMap(args);
    if (syscall !== void 0) {
      // Yes, it's a system call,
      syscall(jsargs, cb);
    }
    else {
      console.log("PENDING: frontend.execCall ", ident, jsargs);
      cb( null, { status:'callret' } );
    }

  }

  return {
    initialize,
    loadConstant,
    loadFunction,
    execAssign,
    execCall,
  };
}









// NOTE: Inline parser of script files.

function gameLaunch() {

  // NOTE: In a client/server system this will wait listening for instruction
  //   for the server and dispatch on the messages as appropriate.

  // Load and parse the scene file,
  const file_set = [ 'sys/init.vnjs', 'start.vnjs' ];
  loadAndParseScene(file_set, function(parsed_vn) {
    
    const front_end = FrontEnd();
    const context = Context(front_end);
    
    // Create interpreter,
    const interpreter = Interpreter(parsed_vn);

    // Initialize state (evaluates all the global variables)
    interpreter.initializeState(context, ( err, retval ) => {
      interpreter.gotoDefine(context, 'start', ( err, retval ) => {

        // Execute the next statement,
        function execNext(err, code) {
          if (err) {
            throw err;
          }
          if (code) {
            if (code.status === 'finished') {
              console.log("Interpreter finished");
              return;
            }
          }
          interpreter.executeStatements(context, execNext);
        }
        // Start the interpreter loop,
        execNext();

      });
    });

  });

}

})();




