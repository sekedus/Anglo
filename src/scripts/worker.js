// clean-css requires http which requires window
self.window = self;
const fs = require("fs");
var UglifyJS = require("uglify-js");
var beautify = require("js-beautify");
var htmlminifier = require("html-minifier");
var cleancss = require("clean-css");
var prettydata = require("pretty-data");

var langs = {
  js: {
    compress: function(opts, cb) {
      try {
        var ugly = UglifyJS.minify(opts.input);
        if (ugly.error) throw ugly.error;
      } catch (e) {
        console.error(e);
        return cb({
          output: opts.input,
          error:
            "Error parsing: " +
            e.message +
            ". Line " +
            e.line +
            ", col " +
            e.col
        });
      }

      cb({
        output: ugly.code
      });
    },
    prettify: function(opts, cb) {
      opts.indent_size = opts.indent_size || 4;
      var pretty = beautify(opts.input, { indent_size: opts.indent_size });
      cb({
        output: pretty
      });
    }
  },
  json: {
    compress: function(opts, cb) {
      try {
        var ugly = JSON.stringify(JSON.parse(opts.input));
      } catch (e) {
        return cb({
          output: opts.input,
          error: "Error parsing: " + e.message
        });
      }

      cb({
        output: ugly
      });
    },
    prettify: function(opts, cb) {
      langs.js.prettify(opts, cb);
    }
  },
  html: {
    compress: function(opts, cb) {
      opts.collapseWhitespace = true;
      opts.minifyCSS = true;
      opts.minifyJS = true;
      // opts.continueOnParseError = true;
      try {
        var ugly = htmlminifier.minify(opts.input, opts);
      } catch (e) {
        return cb({
          output: opts.input,
          error: "Error parsing: " + e.message.replace(/^parse\serror:\s/i, '').substring(0, 55) + "..."
        });
      }

      cb({
        output: ugly
      });
    },
    prettify: function(opts, cb) {
      opts.indent_size = opts.indent_size || 4;
      opts.indent_char = opts.indent_char || " ";
      opts.wrap_line_length = opts.wrap_line_length || 0;
      opts.preserve_newlines = opts.preserve_newlines || false;

      var pretty = beautify.html_beautify(opts.input, opts);
      cb({
        output: pretty
      });
    }
  },
  css: {
    compress: function(opts, cb) {
      try {
        var ugly = new cleancss(opts).minify(opts.input);
        if (ugly.warnings.length > 0) throw ugly.warnings.join(' | ');
        if (ugly.errors.length > 0) throw ugly.errors.join(' | ');
      } catch (e) {
        console.error(e);
        return cb({
          output: opts.input,
          error: "Error parsing: " + e
        });
      }

      cb({
        output: ugly.styles
      });
    },
    prettify: function(opts, cb) {
      var pretty = beautify.css_beautify(opts.input, opts);
      cb({
        output: pretty
      });
    }
  },
  xml: {
    compress: function(opts, cb) {
      var ugly = prettydata.pd.xmlmin(opts.input);
      cb({
        output: ugly
      });
    },
    prettify: function(opts, cb) {
      opts.indent_size = opts.indent_size || 4;
      var pretty = prettydata.pd.xml(opts.input, opts.indent_size);
      cb({
        output: pretty
      });
    }
  }
};

addEventListener("message", function(e) {
  var opts = e.data;

  if (!langs[opts.lang]) {
    return reply(e, opts.input, "Language " + opts.lang + " isn't defined");
  }

  if (!langs[opts.lang][opts.direction]) {
    return reply(
      e,
      opts.input,
      "Direction " + opts.direction + " isn't defined"
    );
  }
  langs[opts.lang][opts.direction](opts, function(resp) {
    reply(e, resp);
  });
});

function reply(event, resp, err) {
  if (err && typeof resp === 'string') {
    resp = {
      output: resp,
      error: err
    }
  }
  postMessage({
    response: resp
  });
}
