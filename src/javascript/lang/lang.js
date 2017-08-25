"use strict";

// VNJS language API

function wait() {
    console.log("PENDING: WAIT...");
}

const consoleVN = console;


module.exports = {
    wait,
    console: consoleVN,
};
