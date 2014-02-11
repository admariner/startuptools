var path                = require('path');

exports.load = load;

function load(webServer) {
  var p = webServer.baseProvider.copy();

  p.addCss(require.resolve('./oom.css'));

  p.addScript(require.resolve('./oommodel.js'), './oommodel');
  p.addScript(require.resolve('./oomview.js'), './oomview');

  if (1) {
    p.addCss(require.resolve('codemirror/lib/codemirror.css'));
    p.addScript(require.resolve('codemirror/lib/codemirror.js'));
    p.addScript(require.resolve('codemirror/keymap/emacs.js'));
    p.addScript(require.resolve('codemirror/mode/javascript/javascript.js'));
    p.addScript(require.resolve('../tlbcore/web/VjsEditUrl.js'));
  }

  p.setTitle('Startup Funding Calculator');
  webServer.setupStdContent('/sfc/');
  webServer.setPrefixHosts('/sfc/', ['sfc.mechanical.ly', 'sfc.tlb.org']);
  webServer.setUrl('/sfc/', p);
}
