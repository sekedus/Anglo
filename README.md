<h1 align="center">
<sub><img src="https://github.com/sekedus/Anglo/blob/main/resources/icon.svg" height="38" width="38"></sub>
Anglo
</h1>

<h3 align="center">This is a Fork of <a href="https://github.com/ashkyd/alchemize"><b>Alchemize</b></a> by AshKyd</h3>

***

A simple code editor that helps you quickly to minimize, pretty print, and inspect HTML, CSS, JSON, JavaScript, and XML.

Minify your source code to reduce file size and `increase the loading speed` or beautify it into a `human-readable format` (easier to understand and maintain).

## Features

* Decompressing / beautifying / pretty-printing HTML, CSS, JavaScript, JSON, and XML. 
* Minifying / uglifying / compressing HTML, CSS, JavaScript, JSON, and XML.
* Syntax highlighting for over 80 languages
* Code reference information
* Auto-completion of code

## Try it out

Try the editor out on  [sekedus.github.io/anglo/](https://sekedus.github.io/anglo/)

## Building/development

### Prereqs:

* [Git](https://git-scm.com/download) `>=2.3.6.1`
* [Node.js](https://nodejs.org/en/download/) `>=18.12.1`
* [ImageMagick](https://imagemagick.org/script/download.php) `>=7.1.0.16`

### Install:

1. `git clone https://github.com/sekedus/anglo` or check out the repo.
2. `cd anglo` navigate to the new directory
3. `npm install` the dependencies.
4. `npm run start` will build into the dist/ folder and launch a server
5. Open your favourite browser and type `localhost:8000`

## Differences from [Alchemize](https://github.com/ashkyd/alchemize)

* Ace --> [Monaco Editor](https://github.com/microsoft/monaco-editor)
* jQuery --> [Vanilla JS](https://stackoverflow.com/questions/20435653/what-is-vanillajs)
* [Bootstrap 3 without jQuery](https://github.com/thednp/bootstrap.native/tree/legacy)

**IMPORTANT**: The Monaco editor is `not` supported in mobile browsers or mobile web frameworks. [#246](https://github.com/microsoft/monaco-editor/issues/246)


## Bugs & errata

Please feel free to report bugs & feature requests on the [GitHub issue tracker](https://github.com/sekedus/anglo/issues). Pull requests are welcome indeed.