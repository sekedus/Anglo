var pkg = require("../../../package.json");
var packages = [
  require("../../../node_modules/monaco-editor/package.json"),
  require("../../../node_modules/uglify-js/package.json"),
  require("../../../node_modules/clean-css/package.json"),
  require("../../../node_modules/html-minifier/package.json"),
  require("../../../node_modules/js-beautify/package.json"),
  require("../../../node_modules/pretty-data/package.json"),
  require("../../../node_modules/bootstrap.native/package.json")
];

module.exports = function() {
  document.querySelector('.modal .version').textContent = pkg.version;

  var _tbody = document.createElement('tbody');

  var _template = document.createElement('tr');
  _template.innerHTML = '<th><a href="#"></a></th><td></td><td></td><td></td>';
  
  packages.forEach(function(pkg) {
    var license = pkg.license.type || pkg.license;
    var author = pkg.author.name || pkg.author;
    var link = 'homepage' in pkg ? `${pkg.homepage}" target="_blank` : 'javascript:void(0)';
    
    var _row = _template.cloneNode(true);
    _row.innerHTML = `<th><a href="${link}">${pkg.name}</a></th><td>v${pkg.version}</td><!--<td>${author}</td><td>${license}</td>-->`;

    _tbody.appendChild(_row);
  });

  var icon = _template.cloneNode(true);
  icon.innerHTML = '<th><a href="https://github.com/astrit/css.gg" target="_blank">CSS.gg</a></th><td>v2.0.0</td><!--<td></td><td></td>-->';
  _tbody.appendChild(icon);

  document.querySelector('#software-table').appendChild(_tbody);
};
