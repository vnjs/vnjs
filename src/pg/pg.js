"use strict";

const fs = require('fs');
const path = require('path');

const Compiler = require('../javascript/vnjscompiler.js');


function pg() {

    // Load the test script,
    fs.readFile(path.join(__dirname, 'scripts', 'pg.nvjs'), "utf8", (err, content) => {
        if (err) {
            console.error("Failed to load pg.nvjs");
            process.exit(-1);
        }

        const compiler = Compiler();
        compiler.compile(content);

    });

}

pg();
