"use strict";

module.exports = (loader) => {

    const clientComm = loader.getStaticProperty('client_comm');

    function genRandomString() {
        let out = '';
        while (true) {
            const v = Math.random().toString(36);
            if (v.length >= 10) {
                return v.substring(2, 8);
            }
        }
    }


    function createUniqueElementId() {
        const ts = Math.floor((new Date().getTime()) / 50);
        const s1 = ts.toString(36);
        const tp = 8 - s1.length;
        const uid = '0000000000000000'.substring(0, tp) + s1;
        const rel = genRandomString();
        return uid + rel;
    }

    function pushElement(id, style) {
        clientComm('s', [ 'pushElement', id, style ]);
    }

    function sendToElement(id, command) {
        const cargs = [];
        const len = arguments.length;
        for (let i = 2; i < len; ++i) {
            cargs.push(arguments[i]);
        }
        clientComm('s', [ 'eleMsg', id, command, cargs ]);
    }

    return {
        createUniqueElementId,
        sendToElement,
        pushElement,
    };
};
