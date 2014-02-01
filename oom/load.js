var path                = require('path');

exports.load = load;

function load(webServer) {
  var p = webServer.baseProvider.copy();

  p.addCss(require.resolve('./oom.css'));
  p.addScript(require.resolve('./oommodel.js'), './oommodel');
  p.addScript(require.resolve('./oomview.js'), './oomview');

  p.setTitle('Don\'t Run Out of Money');
  webServer.setUrl('/drom', p);
}
