# VNJS
An engine for developing visual novel style video games using HTML5 2D Canvas.

**NOTE:** This project is in early development. This repository is missing assets
that allows it to run immediately after a clone. Examples with assets will be added
when the API stabalizes.

### How to Build
Requirements to build: Node.js v6

From the base directory, install browserify:
```console
npm install -g browserify
```
Install all the dependencies for this project:
```console
npm install
```
Transform vn.js into a web bundle:
```console
mkdir web
browserify src\vn.js -t babelify --outfile web\vnweb.js
```

### VNJS Grammar
It's not necessary to generate the grammar to build the project, but if you want
to modify the VNJS language, you'll need to install the Nearley parser generator.
The parser is generated using the following command;
```console
nearleyc src/grammar/vnjs.ne -o src/javascript/vnjsgrammar.js
```
