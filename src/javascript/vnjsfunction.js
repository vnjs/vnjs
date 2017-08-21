"use strict";

function VNJSFunction(script_file, raw_fname) {
    if (script_file !== undefined && raw_fname !== undefined) {

        const v = new VNJSFunction();
        v.getScriptFile = () => {
            return script_file;
        };
        v.getRawFunctionName = () => {
            return raw_fname;
        };
        return v;

    }
}

VNJSFunction.prototype.toString = function() {
    return '[VNJSFunction ' +
            this.getScriptFile() + ' ' +
            this.getRawFunctionName() + ']';
};

module.exports = VNJSFunction;
