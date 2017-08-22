"use strict";

function VNJSFunction(script_file, raw_fname, inner_frame) {
    if (script_file !== undefined && raw_fname !== undefined) {

        const v = new VNJSFunction();
        v.getScriptFile = () => {
            return script_file;
        };
        v.getRawFunctionName = () => {
            return raw_fname;
        };
        v.getInnerFrame = () => {
            return inner_frame;
        };

        return v;

    }
}

VNJSFunction.prototype.toString = function() {
    return '[VNJSFunction ' +
            this.getScriptFile() + ' ' +
            this.getRawFunctionName() + ']';
};

VNJSFunction.prototype.frameAs = function(inner_frame) {
    return VNJSFunction(this.getScriptFile(), this.getRawFunctionName(), inner_frame);
};

module.exports = VNJSFunction;
