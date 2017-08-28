"use strict";

const require_vn = require('../vnjsrequire.js');

// VNJS language API

// Shallow copy all key/values from obj1 into obj2,
function copyObject(obj1, obj2) {
    for (let key in obj1) {
        obj2[key] = obj1[key];
    }
    return obj2;
}



module.exports = (loader) => {

    function wait() {
        console.log("PENDING: WAIT...");
    }

    function requireVN(library_name) {
        const script_file = library_name.replace('.', '/') + '.vnjs';

//        console.log("requireVN... loading: %s", script_file);

        return loader.waitOnCallback((yielder) => {
            loader.prepare(loader.getCurrentFrame(),
                                        script_file, (err, functions) => {
                if (err !== void 0) {
                    return yielder.error(err);
                }
                else {
                    return yielder.return(functions);
                }
            });
        });

    }

    function requireJS(library_name) {
        return require_vn.requireJS(loader, library_name);
    }


    return {
        wait,
        debug: console.log,

        requireVN: requireVN,
        requireJS: requireJS,

        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        String,
        Number,
        JSON,
        Math,
        copyObject,
        Object,
    };
};
