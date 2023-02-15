try {
  navigator.serviceWorker.register('workerService.js');
} catch (e) {
  console.error(e);
}

// Globals and general ugliness.
var BSN = require('bootstrap.native/dist/bootstrap-native.min');
var versioning = require('./_includes/versioning');

var editor;
var before;
var theme;
var setting_unsaved = false;
var bootstrap_modal = false;

// https://github.com/microsoft/monaco-editor/blob/9375d4ba65a3b50fd28569c588d2e279a13a757e/website/typedoc/monaco.d.ts#L4422
var me_options = {
  language: 'plaintext',
  tabSize: 4,
  fontSize: 12,
  wordWrap: 'on',
  contextmenu: false,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  minimap: { enabled: false }
};

var me_themes = [{
  label: 'OS Default',
  value: 'auto'
}, {
  label: 'Visual Studio',
  value: 'vs'
}, {
  label: 'Visual Studio Dark',
  value: 'vs-dark'
}, {
  label: 'High Contrast Dark',
  value: 'hc-black'
}];

var settings = {
  language: {
    type: 'select',
    value: 'plaintext',
    notsave: true
  },
  theme: {
    type: 'select',
    value: 'auto',
    notsave: true
  },
  fontSize: {
    type: 'number',
    value: 12,
    attr: [{
      name: 'min',
      value: '10'
    }, {
      name: 'max',
      value: '48'
    }]
  },
  tabSize: {
    type: 'number',
    value: 4,
    label: 'Indent Size',
    attr: [{
      name: 'min',
      value: '2'
    }, {
      name: 'max',
      value: '8'
    }, {
      name: 'step',
      value: '2'
    }]
  },
  wordWrap: {
    type: 'checkbox',
    value: true,
  },
  contextmenu: {
    type: 'checkbox',
    value: true,
    label: 'Context Menu'
  },
  minimap: {
    type: 'checkbox',
    value: false
  },
  beforeunload: {
    type: 'checkbox',
    value: false
  },
  palette: {
    type: 'checkbox',
    value: false,
    shide: true,
    label: 'Command Button'
  },
  indent: {
    type: 'checkbox',
    value: false,
    shide: true,
    label: 'Indent Button'
  },
  keyboard: {
    type: 'checkbox',
    value: false,
    shide: true,
    label: 'Keyboard Button'
  }
};

// Formats support
var formats = {
  Text: {
    name: "Text",
    filename: /\.txt$/i,
    parser: "text",
    lang: "plaintext",
    actions: []
  },
  JavaScript: {
    name: "JavaScript",
    filename: /\.js$/i,
    parser: "js",
    lang: "javascript",
    actions: ["compress", "prettify"]
  },
  HTML: {
    name: "HTML",
    filename: /\.html?$/i,
    parser: "html",
    lang: "html",
    actions: ["compress", "prettify"]
  },
  CSS: {
    name: "CSS",
    filename: /\.css$/i,
    parser: "css",
    lang: "css",
    actions: ["compress", "prettify"]
  },
  XML: {
    name: "XML",
    filename: /\.xml$/i,
    parser: "xml",
    lang: "xml",
    actions: ["compress", "prettify"]
  },
  JSON: {
    name: "JSON",
    filename: /\.json$/i,
    parser: "json",
    lang: "json",
    actions: ["compress", "prettify"]
  },
  PHP: {
    name: "PHP",
    filename: /\.php$/i,
    parser: "php",
    lang: "php",
    actions: []
  },
  Java: {
    name: "Java",
    filename: /\.(java?|as)$/i,
    parser: "java",
    lang: "java",
    actions: []
  },
  Markdown: {
    name: "Markdown",
    filename: /.m(ark)?d(ow)?n?$/i,
    parser: "markdown",
    lang: "markdown",
    actions: []
  }
};

// #===========================================================================================#

// DOM parents() https://github.com/ziggi/dom-parents
function getParents(element, selector) {
  var isWithSelector = selector !== undefined;
  var parents = [];
  var elem = element.parentElement;

  while (elem !== null) {
    if (elem.nodeType === Node.ELEMENT_NODE) {
      if (!isWithSelector || elem.matches(selector)) {
        parents.push(elem);
      }
    }
    elem = elem.parentElement;
  }

  return parents;
}

function message(msg, error) {
  var status_msg = document.querySelector('.status.message');
  if (error) {
    console.error(msg);
    status_msg.classList.add('alert-danger');
  } else {
    status_msg.classList.remove('alert-danger');
  }
  status_msg.textContent = msg;
}

function changeLang(format) {
  document.querySelector('.formats').value = format;
  var _actions = document.querySelectorAll('.action');
  _actions.forEach(function(item) {
    item.setAttribute('disabled', 'disabled');
    if (formats[format].actions.indexOf(item.getAttribute('data-action')) != -1) item.removeAttribute('disabled'); 
  });
  settings.language.value = formats[format].lang;
  monaco.editor.setModelLanguage(editor.getModel(), settings.language.value);
}

function changeValue(output) {
  editor.executeEdits(null, [{
    text: output,
    range: editor.getModel().getFullModelRange()
  }]);
  editor.pushUndoStop();
}

function bytesToDisplay(bytes, units) {
  return Math.round(bytes / 10.24) / 100 + (units ? ' KB' : '');
}

// #===========================================================================================#

function detectContentTypeFromContent(content) {
  var round1 = [
    // Matches an initial /* comment */ and subsequent function def.
    {
      test: /^\/\*(.|\n)+function\s*\(/,
      type: "JavaScript"
    },
    {
      test: /<html(.*)?>/,
      type: "HTML"
    },
    {
      test: /<(div|span|ul|li|head|script)(.*)?>/,
      type: "HTML"
    },
    {
      // Matches a partial arrow function
      test: /\)\s?=>/,
      type: "JavaScript"
    },
    {
      test: /^\s*{/,
      type: "JSON"
    },
    {
      test: /console\.log/,
      type: "JavaScript"
    },
    {
      test: /function\s*\(/,
      type: "JavaScript"
    },
    {
      test: /@import/,
      type: "CSS"
    },
    // Matches something like "foo {", a syntax you'd likely
    // not find elsewhere
    // False positive on var a=\n//foo\n{a:b}
    {
      test: /\w+\s*\{/,
      type: "CSS"
    },
    // Matches assignment, excluding something like the CSS syntax [foo=bar]
    // False positive on something like @import("/foo?a=b")
    {
      test: /\s[^'"\[]+\=/,
      type: "JavaScript"
    },
    {
      test: /^\s*</,
      type: "XML"
    }
  ];

  for (var i = 0; i < round1.length; i++) {
    if (content.match(round1[i].test)) {
      return round1[i].type;
    }
  }

  return false;
}

function detectContentTypeFromExtension(filename) {
  for (var i in formats) {
    if (filename.match(formats[i].filename)) {
      return i;
    }
  }
}

function detectContentType(filename, content) {
  var format;
  format = detectContentTypeFromExtension(filename);
  if (!format) {
    format = detectContentTypeFromContent(content);
  }
  if (!format) {
    format = 'Text';
  }
  changeLang(format);
}

function pasteCheck() {
  var select = editor.getSelection();
  var range = editor.getModel().getFullModelRange();
  var select_all = select.startLineNumber == range.startLineNumber && select.startColumn == range.startColumn && select.endLineNumber == range.endLineNumber && select.endColumn == range.endColumn;
  return editor.getValue() == '' || select_all;
}

// #===========================================================================================#

function dragSingle(file) {
  var reader = new FileReader();

  reader.onload = function(event) {
    // Uglify occasionally inserts \x01 for some reason.
    var isBinary = /[\x00\x02-\x08\x0E-\x1F]/.test(event.target.result);
    if (isBinary) {
      window.bin = event.target.result;
      message('Binary file detected. Loading as base64.');
      reader.readAsDataURL(file);
    } else {
      changeValue('');
      detectContentType(file.name, event.target.result);
      changeValue(event.target.result);
    }
  };

  reader.readAsText(file);
}

function initDrag() {
  var holder = document.body;

  holder.ondragover = function() {
    this.classList.add('hover');
    return false;
  };
  holder.ondragend = function() {
    this.classList.remove('hover');
    return false;
  };
  holder.ondrop = function(event) {
    this.classList.remove('hover');
    event.preventDefault();

    dragSingle(event.dataTransfer.files[0]);
    return false;
  };
}

// #===========================================================================================#

function postMessage(payload) {
  // If we've got a worker, use that! these should be mutually exclusive.
  if (worker) {
    worker.postMessage(payload);
  }

  document.querySelector('.progress').classList.add('show');
  document.querySelectorAll('button, select').forEach(function(item) {
    item.setAttribute('disabled', 'disabled');
  });
  message(payload.direction + 'ing…');
}

function performAction() {
  var format = document.querySelector('.formats').value;
  var action = this.getAttribute('data-action');
  var input = editor.getValue();
  before = input.length;
  postMessage({
    lang: formats[format].parser,
    direction: action,
    input: input,
    indent_size: settings.tabSize.value
  });
  return false;
}

function formatChange(format) {
  changeLang(document.querySelector('.formats').value);
}

// #===========================================================================================#

function genOptions(id, data) {
  var opt;
  if (data.type == 'number') {
    opt = Number(data.value);
  } else if (data.type == 'select' || (data.type == 'checkbox' && id != 'wordWrap' && id != 'minimap')) {
    opt = data.value;
  } else if (id == 'wordWrap') {
    opt = data.value ? 'on' : 'off';
  } else if (id == 'minimap') {
    opt = {enabled: data.value};
  }
  return opt;
}

function settingsUpdate(data) {
  for (var id in settings) {
    var val, st = settings[id];
    if (data) {
      val = data[id].value;
    } else {
      var elem = document.querySelector(`#st-${id}`);
      if (st.type == 'select' || st.type == 'number') {
        val = elem.value;
      } else if (st.type == 'checkbox') {
        val = elem.checked;
      }
    }
    if (!('notsave' in st)) settings[id].value = val;
  
    if (id in me_options && !('notsave' in st)) me_options[id] = genOptions(id, settings[id]);

    if ('shide' in st) {
      var st_btn = document.querySelector(`.${id}`);
      if (st.value) {
        st_btn.removeAttribute('hidden');
      } else {
        st_btn.setAttribute('hidden', '');
      }
    }
  };
  
  editor.updateOptions(me_options);
}

function settingsSave() {
  settingsUpdate();
  localStorage.setItem('settings', JSON.stringify(settings));
  
  setting_unsaved = false;
  new BSN.Modal(document.querySelector('#settings')).hide();
}

function settingsShow() {
  for (var id in settings) {
    var elem = document.querySelector(`#st-${id}`);
    var pr = getParents(elem, '.form-group')[0];
    pr.querySelector('label').classList.remove('highlighted');

    var st = settings[id];
    if (st.type == 'select' || st.type == 'number') {
      elem.value = st.value;
    } else if (st.type == 'checkbox') {
      elem.checked = st.value;
    }
  };
}

function settingsHtml() {
  var st_str = '<div class="form-horizontal">';
  for (var id in settings) {
    var st = settings[id];
    var label_str = 'label' in st ? st.label : id.replace(/([A-Z])/g, ' $1').replace(/^.{1}/, function(x){return x.toUpperCase()});
    
    var attr_str = '';
    if ('attr' in st) st.attr.forEach(function(x){attr_str += ` ${x.name}="${x.value}"`});
    
    st_str += '<div class="form-group">';
    st_str += `<label for="st-${id}" class="col-xs-5 control-label">${label_str}</label>`;
    st_str += '<div class="';
    if (st.type == 'checkbox') st_str += 'checkbox ';
    st_str += 'col-xs-7">';
    if (st.type == 'select') {
      st_str += `<select id="st-${id}" class="form-control"${attr_str}></select>`;
    } else if (st.type == 'number') {
      st_str += `<input type="number" class="form-control" id="st-${id}"${attr_str}>`;
    } else if (st.type == 'checkbox') {
      st_str += `<label><input type="checkbox" id="st-${id}"${attr_str}></label>`;
    }
    st_str += '</div>';
    st_str += '</div>';
    if (id == 'theme') st_str += '<div class="line-space"></div>';
  };
  st_str += '</div>';
  
  document.querySelector('#settings .modal-body').innerHTML = st_str;
}

function initSettings() {
  settingsHtml();

  var st_local = localStorage.getItem('settings');
  if (st_local) settingsUpdate(JSON.parse(st_local));

  for (var _id in settings) {
    var elem = document.querySelector(`#st-${_id}`);

    if (_id == 'language') {
      monaco.languages.getLanguages().forEach(function(lang) {
        var opt = document.createElement('option');
        opt.value = lang.id;
        opt.text = lang.id;
        elem.add(opt);
      });
    } else if (_id == 'theme') {
      me_themes.forEach(function(theme) {
        var opt = document.createElement('option');
        opt.value = theme.value;
        opt.text = theme.label;
        elem.add(opt);
      });
    }
    
    elem.addEventListener('change', function() {
      var el = this;
      var id = this.id.replace(/^st-/, '');
      var st = settings[id];

      if (id == 'language') {
        monaco.editor.setModelLanguage(editor.getModel(), el.value);
        var format = Object.keys(formats).filter(function(x){ return formats[x].lang == el.value; });
        document.querySelector('.formats').value = format.length > 0 ? format[0] : 'Text';
      } else if (id == 'theme') {
        var browser_theme = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'vs-dark' : 'vs';
        monaco.editor.setTheme(el.value == 'auto' ? browser_theme : el.value);
        settings.theme.value = el.value == 'auto' ? el.value : editor._themeService.getColorTheme().id;
      }
  
      if (!('notsave' in st)) {
        var pr = getParents(el, '.form-group')[0];
        var key = el.type == 'checkbox' ? 'checked' : 'value';
        if (el[key] != st.value) {
          setting_unsaved = true;
          pr.querySelector('label').classList.add('highlighted');
          document.querySelector('#settings .save.btn').classList.add('pulse');
        } else {
          setting_unsaved = false;
          pr.querySelector('label').classList.remove('highlighted');
          document.querySelector('#settings .save.btn').classList.remove('pulse');
        }
      }
    });
  };
}

// #===========================================================================================#

function themeApply(event) {
  var DOC = document.documentElement;
  var local_theme = localStorage.getItem('theme');
  var browser_theme = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';

  DOC.classList.remove('auto', 'dark', 'light');
  if (!event) theme = local_theme;
  var user_theme = theme == 'auto' ? browser_theme : theme;
  
  if (theme == 'auto') {
    DOC.classList.add('auto');
  } else {
    DOC.classList.remove('auto');
  }

  DOC.classList.remove('dark', 'light');
  DOC.classList.add(user_theme);
  monaco.editor.setTheme(user_theme == 'dark' ? 'vs-dark' : 'vs');
  settings.theme.value = theme == 'auto' ? theme : editor._themeService.getColorTheme().id;
  localStorage.setItem('theme', theme);
}

function initTheme() {
  themeApply(); //default

  document.querySelector('.theme-switch').addEventListener('click', function(event) {
    theme = theme == 'auto' ? 'dark' : theme == 'dark' ? 'light' : 'auto';
    themeApply(event);
  });
}

// #===========================================================================================#

function editorTrigger(selector, string, action) {
  document.querySelector(selector).addEventListener('click', function() {
    editor.focus();
    editor.trigger(string, action); //similar: getAction().run() (promise)
  });
}

function editorResize() {
  var nav_top = document.querySelector('.navbar-static-top').offsetHeight;
  var nav_bottom = document.querySelector('.navbar-fixed-bottom').offsetHeight;
  document.querySelector('#editor').style.height = document.documentElement.clientHeight - (nav_top + nav_bottom) + 'px';
}

function onmessage(event) {
  document.querySelector('.progress').classList.remove('show');
  document.querySelectorAll('button, select').forEach(function(item) {
    item.removeAttribute('disabled');
  });
  
  var output = event.data.response.output;
  var error = event.data.response.error;
  changeValue(output);
  if (error) {
    message(error, true);
  } else {
    message('New size: ' + bytesToDisplay(output.length, true) + ', saving ' + bytesToDisplay(before - output.length, true));
  }
}

var worker;
function initWorker() {
  // If we don't have workers for whatever reason, fire up a frame.
  if (typeof Worker !== 'function') {
    return message("this browser doesn't support workers. I can't go on!");
  }
  worker = new Worker('worker.js');
  worker.onmessage = onmessage;
}

window.addEventListener('DOMContentLoaded', function() {
  initWorker();
  editorResize();

  amdRequire(['vs/editor/editor.main'], function() {
    monaco.languages.register({id: 'vs.editor.nullLanguage'});
    monaco.languages.setLanguageConfiguration('vs.editor.nullLanguage', {});

    editor = monaco.editor.create(document.getElementById('editor'), me_options);
    editor.focus();
    window['editor'] = editor;
    // console.log(editor._actions);
    // console.log(editor.getActions());
  
    initTheme();

    initSettings();
    document.querySelector('#settings .save').addEventListener('click', settingsSave);
    document.querySelector('#settings').addEventListener('show.bs.modal', settingsShow);
    document.querySelector('#settings').addEventListener('hide.bs.modal', function(event) {
      if (setting_unsaved && !confirm('Are you sure you want to leave this page? All unsaved changes will be lost.')) {
        event.preventDefault();
        return false;
      } else {
        setting_unsaved = false;
      }
    });
    
    // https://stackoverflow.com/q/70437649/7598333
    editor.getContainerDomNode().addEventListener('paste', function() {
      if (pasteCheck()) {
        // Break out so the editor can actually have the new value set.
        setTimeout(function() { detectContentType('', editor.getValue()); });
      }
    }, true);

    editor.onDidChangeCursorSelection(function(event) {
      var selected = editor.getModel().getValueInRange(event.selection).length;
      var selection = `Ln ${event.selection.positionLineNumber}, Col ${event.selection.positionColumn} ` + (selected > 0 ? `(${selected} selected)` : '');
      document.querySelector('.status.selection').innerHTML = selection;
      document.querySelector('.status.selection').classList.add('active');
    });

    // https://stackoverflow.com/a/54262691/7598333
    editor.getModel().onDidChangeContent(function() {
      document.querySelector('.status.message').textContent = document.querySelector('.formats').value;
      message(bytesToDisplay(editor.getValue().length, true));

      if (settings.beforeunload.value && editor.getValue() != '') {
        window.onbeforeunload = function() { return 'Are you sure you want to leave this page? All unsaved changes will be lost.'; };
      } else {
        window.onbeforeunload = null;
      }
    });

    // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-adding-an-action-to-an-editor-instance
    editor.addAction({
      id: 'searchWithGoogle',
      label: 'Search With Google',
      precondition: 'editorHasSelection',
      contextMenuGroupId: 'custom_menu',
      run: function(ed) {
        var keyword = ed.getModel().getValueInRange(ed.getSelection()).replace(/\s+/g, ' ');
        window.open('//google.com/search?q=' + encodeURIComponent(keyword));
      }
    });

    editor.addAction({
      id: 'showSettings',
      label: 'Settings',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
      contextMenuGroupId: 'custom_menu',
      run: function() {
        new BSN.Modal(document.querySelector('#settings')).show(); //openGlobalSettings
      }
    });
  
    editorTrigger('.palette', 'Command Palette', 'editor.action.quickCommand');
    editorTrigger('.indent', 'Format Document', 'editor.action.formatDocument');
    editorTrigger('.status.selection', 'Go to Line/Column', 'editor.action.gotoLine');

    // ref: http://aka.ms/vscodekeybindings
    document.querySelector('#keybindings').addEventListener('show.bs.modal', function() {
      var kb_el = document.querySelector('#keybindings tbody');
      if (kb_el.innerHTML == '') {
        var kb_lists = editor._standaloneKeybindingService._getResolver()._keybindings;
        var kb_str = '';

        kb_lists.forEach(function(kb, n) {
          var cmd = kb.command;
          var key = kb.keypressParts.join(' | ');
  
          kb_str += '<tr>';
          kb_str += `<th scope="row">${n+1}</th>`;
          kb_str += `<td>${key}</td>`;
          kb_str += `<td>${cmd.replace(/^vs\.editor\.ICodeEditor:\d+:/, '')}</td>`;
          kb_str += '</tr>';
        });
        
        kb_el.innerHTML = kb_str;
      }
    });

    var format_lists = '';
    for (var i in formats) {
      format_lists += '<option>' + formats[i].name + '</option>';
    }
    document.querySelector('.formats').innerHTML = format_lists;
    document.querySelector('.formats').addEventListener('change', formatChange);
    changeLang('Text');

    document.querySelectorAll('button.action').forEach(function(item) {
      item.addEventListener('click', performAction);
    });
    
    initDrag();
  
    versioning();
  
    message('Drag a file or paste from the clipboard');
  
    document.body.classList.remove('preload');
    document.body.classList.add('loaded');

    require('./preload.js');

    document.querySelectorAll('.modal.fade').forEach(function(item) {
      item.addEventListener('shown.bs.modal', function(){ bootstrap_modal = true; });
      item.addEventListener('hidden.bs.modal', function() {
        bootstrap_modal = false;
        editor.focus();
      });
    });
  });
});

window.addEventListener('resize', editorResize);
window.addEventListener('focus', function() {
  if (editor && !bootstrap_modal) editor.focus();
});
if ('onvisibilitychange' in document) {
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && editor && !bootstrap_modal) editor.focus();
  });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeApply);