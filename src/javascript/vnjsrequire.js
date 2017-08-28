"use strict";

const VNJSFunction = require('./vnjsfunction.js');

// Pre-cache all standard libraries,
const js_libs = {
    "client": (loader) => require('./lang/client.js')(loader),
    "util": (loader) => require('./lang/util.js')(loader),
    "lang": (loader) => require('./lang/lang.js')(loader),
};

function requireJS(loader, library_file) {

    // Return an object that will serialize,

    const generator = js_libs[library_file];

    if (generator !== void 0) {
        const lib_object = generator(loader);
        const out_obj = {};
        for (let func_name in lib_object) {
            out_obj[func_name] = VNJSFunction('REQ:' + library_file, func_name);
        }
        return out_obj;
    }

    throw Error('Library not found: ' + library_file);

}

function resolve(loader, library_file, function_name) {

    // PENDING: We should probably cache some of this.
    //   'js_lib[library_file](loader)' will create a new object.

    return js_libs[library_file](loader)[function_name];

}

module.exports = {
    requireJS,
    resolve,
};
