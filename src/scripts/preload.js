// prefetch language files
[ "typescript", "html", "css", "json" ].forEach(function(lang){
  ['Worker', 'Mode'].forEach(function(script){
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = './monaco/min/vs/language/'+lang+'/'+(lang == 'typescript' ? 'ts' : lang)+script+'.js';
    link.as = 'script';
    document.head.appendChild(link);
  });
});
// prefetch basic-language files
[ "javascript", "html", "css", "xml", "php", "java", "markdown" ].forEach(function(lang){
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = './monaco/min/vs/basic-languages/'+lang+'/'+lang+'.js';
  link.as = 'script';
  document.head.appendChild(link);
});