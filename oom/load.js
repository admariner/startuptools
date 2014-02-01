var path                = require('path');

exports.load = load;

function load(webServer) {
  var p = webServer.baseProvider.copy();

  p.addCss(require.resolve('./oom.css'));
  p.addScript(require.resolve('./oommodel.js'), './oommodel');
  p.addScript(require.resolve('./oomview.js'), './oomview');

  p.setTitle('Startup Calculator');
  webServer.setUrl('/oom/', p);

  if (0) webServer.setUrl('/oom/images/', path.dirname(require.resolve('./images')));
}
