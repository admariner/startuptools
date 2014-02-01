
var oommodel            = require('./oommodel');

$.defPages('oom', 
          function(rest) {
            var rs = rest.split(',');
            return {
              rev0: rs[0] ? parseFloat(rs[0]) : undefined,
              exp0: rs[1] ? parseFloat(rs[1]) : undefined,
              revGrowth: rs[2] ? parseFloat(rs[2]) : undefined,
              expGrowth: rs[3] ? parseFloat(rs[3]) : undefined,
            };
          },
          function(o) {
            return ''; // WRITEME
          },
          function(o) {
            var top = this;
            var m = new oommodel.OomModel(o);
            var winW, winH;
            console.log('OomModel stored in window.oom0 for your convenience');
            window.oom0 = m;

            top.html('<div class="oomView"><canvas class="oomCanvas"></canvas></div>' +
                     '<div class="oomFooter"></div>');

            top.find('.oomCanvas').fmtOomCanvas(m);
            top.find('.oomFooter').fmtOomFooter();

            $(top).children().first().bogartWindowEvents({
              'resize': onWindowResize,
              'keydown': onWindowKeydown
            });

            getSizes();
            adjustSizes();
            top.animation2(m);
            m.emit('changed');
            return this;

            function onWindowKeydown(ev) {
              // WRITEME
            }

            function onWindowResize(ev) {
              if (top.find('.scopeCanvas').length === 0) return false;
              if (getSizes()) adjustSizes();
            }

            function getSizes() {
              var oldWinW = winW, oldWinH = winH;
              winW = Math.max(500, $(window).width());
              winH = Math.max(400, $(window).height());
              return (winW !== oldWinW || winH !== oldWinH);
            }
            
            function adjustSizes() {
              var padL = 5, padR = 5;
              var footerH = 40;
              var headerH = 10;
              var mainW = winW - padL - padR;
              var mainH = winH - headerH - footerH - 10;
              top.find('.oomView').each(function() {
                $(this).css({
                  width: (mainW).toString() + 'px', 
                  height: (mainH).toString() + 'px',
                  left: (padL).toString() + 'px',
                  top: (headerH).toString() + 'px'
                });
                var canvas = $(this).find('.oomCanvas')[0];
                canvas.height = mainH;
                canvas.width = mainW;
                $(this).maximizeCanvasResolution();
              });


              // WRITEME
            }
          });

$.fn.fmtOomCanvas = function(m) {
  var top = this;
  var canvas = top[0];
  var hd = new HitDetector(); // Persistent

  top.on('mousedown', function(ev) {
    var mdX = ev.offsetX;
    var mdY = ev.offsetY;
    var action = hd.find(mdX, mdY);
    if (action) {
      hd.buttonDown = true;
      if (action.onDown) {
        action.onDown(hd, mdX, mdY);
      }
    }
    m.emit('changed');
    return false;
  });

  top.on('mousemove', function(ev) {
    var mdX = ev.offsetX;
    var mdY = ev.offsetY;
    var action = hd.find(mdX, mdY);
    if (hd.buttonDown || action || hd.hoverActive) {
      hd.mdX = mdX;
      hd.mdY = mdY;
      if (hd.dragging) {
        hd.dragging(mdX, mdY);
      }
      m.emit('changed');
    }
  });
  
  top.on('mouseup', function(ev) {
    hd.mdX = hd.mdY = null;
    hd.buttonDown = false;
    hd.dragging = null;
    var mdX = ev.offsetX;
    var mdY = ev.offsetY;
    var action = hd.find(mdX, mdY);
    if (action && action.onUp) {
      action.onUp();
    }
    m.emit('changed');
    return false;
  });

  m.on('animate', function() {
    var t0 = Date.now();
    var ctx = canvas.getContext('2d');
    var pixelRatio = canvas.pixelRatio;
    ctx.save();
    ctx.scale(pixelRatio, pixelRatio); // setTransform(canvas.pixelRatio, 0, 0, 0, canvas.pixelRatio, 0);
    ctx.textLayer = mkDeferQ();
    ctx.buttonLayer = mkDeferQ();
    ctx.cursorLayer = mkDeferQ();
    hd.beginDrawing(ctx);
    var cw = canvas.width / pixelRatio;
    var ch = canvas.height / pixelRatio;
    var lo = {boxL: 0, boxT: 0, boxR: cw, boxB: ch, 
              px: 1, 
              snap: function(x) { return Math.round(x * pixelRatio) / pixelRatio; },
              snap5: function(x) { return (Math.round(x * pixelRatio - 0.5) + 0.5) / pixelRatio; },
              thinWidth: 1 / pixelRatio
             };

    ctx.clearRect(0, 0, cw, ch);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';

    drawOom(m, ctx, hd, lo, {});

    ctx.textLayer.now();
    ctx.buttonLayer.now();
    ctx.cursorLayer.now();
    ctx.textLayer = ctx.buttonLayer = ctx.cursorLayer = undefined; // GC paranoia

    hd.endDrawing();
    ctx.restore();
  });
}

$.fn.fmtOomEditor = function(v) {
  this.html('<p class="oomPanelTitle">Startup Growth</p>' +
            '<form>' +
            '<table class="oomEditorTable">' +
            '<tr><td>Initial Cash</td><td>$<input name="cash0" type=text size=7></td></tr>' +
            '<tr><td>Weekly Expenses</td><td>$<input name="expense" type=text size=6></td></tr>' +
            '<tr><td>Weekly Revenue</td><td>$<input name="revenue0" type=text size=6></td></tr>' +
            '<tr><td>Weekly Growth Rate</td><td><input name="growth" type=text size=3>%</td></tr>' +
            '</table></form>');
  this.find('[name=cash0]').val(v.m.cash0.toString()).on('change', function(ev) {
    v.m.cash0 = parseFloat($(this).val());
    v.m.setup();
  });
  this.find('[name=expense]').val(v.m.expense).on('change', function(ev) {
    v.m.expense = parseFloat($(this).val());
    v.m.setup();
  });
  this.find('[name=revenue0]').val(v.m.revenue0).on('change', function(ev) {
    v.m.revenue0 = parseFloat($(this).val());
    v.m.setup();
  });
  this.find('[name=growth]').val(v.m.growth * 100).on('change', function(ev) {
    v.m.growth = parseFloat($(this).val() / 100);
    v.m.setup();
  });
};


$.fn.fmtOomFooter = function(o) {
  this.html('<center>' +
            '<!-- <span class="foot"><a href="#about">About</a></span> -->' +
            '</center>');
  return this;
};

function fmtWeek(week) {
  return 'week ' + week.toFixed(0);
}

function fmtMoney(v, prec) {
  if (v >= 1000000000*prec) {
    return '$' + (v/1000000).toFixed(0) + 'B';
  }
  if (v >= 1000000*prec) {
    return '$' + (v/1000000).toFixed(0) + 'M';
  }
  if (v >= 1000*prec) {
    return '$' + (v/1000).toFixed(0) + 'k';
  }
  return '$' + v.toFixed(0);
}

function fmtGrowth(v) {
  return (v*100).toFixed(1) + '%';
}

function drawTooltip(ctx, lo, x, y, str) {
  var lines = str.split('\n');

  ctx.font = '12px Arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  var lineH = 20;
  var textW = _.reduce(lines, function(prevMax, line) { return Math.max(prevMax, ctx.measureText(str).width); }, 20);
  var textH = lineH * lines.length;

  if (y < lo.boxT + textH + 10) { // close to top, show below
    y += textH/2 + 10;
  } else {
    y -= textH/2 + 10;
  }
  if (x < lo.boxL + 10) {
    x = lo.boxL + 10;
  } 
  else if (x > lo.boxR - 10 - textW) {
    x = lo.boxR - 10 - textW;
  }

  var ttL = x - 6;
  var ttR = x + 6 + textW;
  var ttT = y - textH/2;
  var ttB = y + textH/2 + 2;
  ctx.beginPath();
  ctx.moveTo(ttL, ttT);
  ctx.lineTo(ttR, ttT);
  ctx.lineTo(ttR, ttB);
  ctx.lineTo(ttL, ttB);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,202,0.9)';
  ctx.fill();
  ctx.fillStyle = '#000023';
  _.each(lines, function(line, lineIndex) {
    ctx.fillText(line, x, ttT + 10 + lineH * lineIndex);
  });
}

function mkShinyPattern(ctx, butL, butT, butR, butB, loCol, hiCol) {
  var cX = (butL + butR)/2;
  var skew = 0;
  var pat = ctx.createLinearGradient(cX-skew, butT, cX+skew, butB); // vertical
  pat.addColorStop(0.125, '#e5e5e5');
  pat.addColorStop(0.250, loCol);
  pat.addColorStop(0.375, hiCol);
  pat.addColorStop(0.875, '#e5e5e5');
  pat.addColorStop(1.000, '#e5e5e5');
  return pat;
}

function drawDragHandle(ctx, cX, cY, radius, style) {
  ctx.beginPath();

  ctx.lineWidth = radius/4;
  switch(style) {
  case 'exp': ctx.fillStyle = mkShinyPattern(ctx, cX-radius, cY-radius, cX+radius, cY+radius, '#b20000', '#ff0000'); break;
  case 'rev': ctx.fillStyle = mkShinyPattern(ctx, cX-radius, cY-radius, cX+radius, cY+radius, '#008e00', '#00cc00'); break;
  }
  ctx.arc(cX, cY, radius, 0, Math.PI*2);
  ctx.fill();

  switch(style) {
  case 'exp': ctx.strokeStyle = '#b20000'; break;
  case 'rev': ctx.strokeStyle = '#007a00'; break;
  }
  ctx.stroke();
  ctx.beginPath();
  switch(style) {
  case 'exp': 
    ctx.fillStyle = '#ff0000';
    ctx.arc(cX, cY, 0.2*radius, 0, 2*Math.PI);
    ctx.fill();
    break;
  case 'rev': 
    ctx.fillStyle = '#00ff00';
    ctx.arc(cX, cY, 0.2*radius, 0, 2*Math.PI);
    ctx.fill();
    break;
  }
}

function drawOom(m, ctx, hd, lo, o) {

  lo.plotL = lo.boxL + 60;
  lo.plotR = lo.boxR - 60;
  lo.plotT = lo.boxT + 20;
  lo.plotB = lo.boxB - 30;
  lo.dragRad = 7;

  lo.convWeekToX = function(week) {
    return (week / m.nWeeks) * (lo.plotR - lo.plotL) + lo.plotL;
  };
  lo.convXToWeek = function(x) {
    return (x - lo.plotL) / (lo.plotR - lo.plotL) * m.nWeeks;
  };
  lo.convFlowToY = function(flow) {
    return (Math.log(flow) - Math.log(m.minFlow)) / (Math.log(m.maxFlow) - Math.log(m.minFlow)) * (lo.plotT - lo.plotB) + lo.plotB;
  };
  lo.convYToFlow = function(y) {
    return Math.exp((y - lo.plotB) / (lo.plotT - lo.plotB) * (Math.log(m.maxFlow) - Math.log(m.minFlow)) + Math.log(m.minFlow));
  };

  drawAxes();
  drawCapital();
  drawExp();
  drawRev();
  drawBreakeven();
  drawXLabels();
  drawYLabels();

  return;

  function drawAxes() {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = lo.thinWidth;
    ctx.beginPath();
    ctx.moveTo(lo.plotL, lo.plotB);
    ctx.lineTo(lo.plotR, lo.plotB);
    ctx.moveTo(lo.plotL, lo.plotB);
    ctx.lineTo(lo.plotL, lo.plotT);
    ctx.moveTo(lo.plotR, lo.plotB);
    ctx.lineTo(lo.plotR, lo.plotT);
    ctx.stroke();
  }

  function drawXLabels() {
    ctx.font = '12px Arial';
    _.each([0, 1, 2, 3], function(year) {
      var week = year * 52;
      var label = 'year ' + year.toString();
      var weekX = lo.convWeekToX(week);

      ctx.beginPath();
      ctx.moveTo(weekX, lo.plotB);
      ctx.lineTo(weekX, lo.plotB+7);

      ctx.strokeStyle = '#888888';
      ctx.lineWidth = lo.thinWidth;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, weekX, lo.plotB + 10);
    });
  }

  function drawYLabels() {
    ctx.font = '12px Arial';
    _.each([1,2,5], function(flow) {
      while (flow <= m.maxFlow) {
        var label = fmtMoney(flow, 1);
        var flowY = lo.convFlowToY(flow);

        ctx.beginPath();
        ctx.moveTo(lo.plotL, flowY);
        ctx.lineTo(lo.plotL-7, flowY);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = lo.thinWidth;
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lo.plotL - 10, flowY);
        
        ctx.beginPath();
        ctx.moveTo(lo.plotR, flowY);
        ctx.lineTo(lo.plotR+7, flowY);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = lo.thinWidth;
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lo.plotR + 10, flowY);
        
        flow *= 10;
      }
    });
  }

  function drawCapital() {
    if (m.breakevenWeek > 0) {
      var p0X = lo.convWeekToX(0);
      var p0Y = lo.convFlowToY(m.rev0);
      var p1X = lo.convWeekToX(0);
      var p1Y = lo.convFlowToY(m.exp0);
      var p2X = lo.convWeekToX(m.breakevenWeek);
      var p2Y = lo.convFlowToY(m.breakevenFlow);

      ctx.beginPath();
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p1X, p1Y);
      ctx.lineTo(p2X, p2Y);
      ctx.fillStyle = '#eeeeff';
      ctx.fill();
    }
    var lbWeek = m.breakevenWeek > 0 ? Math.min(20, m.breakevenWeek / 4) : 20;
    var lbX = lo.convWeekToX(lbWeek);
    var lbY = (lo.convFlowToY(m.revAtWeek(lbWeek)) + lo.convFlowToY(m.expAtWeek(lbWeek))) / 2;
    var label = m.capitalNeeded > 0 ? (fmtMoney(m.capitalNeeded, 10) + ' capital needed') : 'Infinite capital needed';

    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lbX, lbY);
  }

  function drawRev() {
    var p0X = lo.convWeekToX(0);
    var p0Y = lo.convFlowToY(m.rev0);
    var p1X = lo.convWeekToX(m.nWeeks);
    var p1Y = lo.convFlowToY(m.revN);
    
    ctx.beginPath();
    ctx.moveTo(p0X, p0Y);
    ctx.lineTo(p1X, p1Y);
    ctx.strokeStyle = '#00cc00';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(p0X, p0Y);
    ctx.rotate(Math.atan2(p1Y-p0Y, p1X-p0X));
    var label = fmtMoney(m.rev0, 10) + ' revenue, growing ' + fmtGrowth(m.revGrowth) + ' weekly';
    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 20, +4);
    ctx.restore();

    hd.add(p0X-lo.dragRad, p0Y-lo.dragRad, p0X+lo.dragRad, p0Y+lo.dragRad, function() {
      drawDragHandle(ctx, p0X, p0Y, lo.dragRad, 'rev');
    }, {onDown: function(hd, mdX, mdY) {
      hd.dragging = function(dragX, dragY) {
        var newRev = lo.convYToFlow(dragY);
        m.setRev0(newRev);
      };
    }}, function() {
      drawTooltip(ctx, lo, p0X, p0Y, 'Drag to change initial weekly revense');
    });

    hd.add(p1X-lo.dragRad, p1Y-lo.dragRad, p1X+lo.dragRad, p1Y+lo.dragRad, function() {
      drawDragHandle(ctx, p1X, p1Y, lo.dragRad, 'rev');
    }, {onDown: function(hd, mdX, mdY) {
      hd.dragging = function(dragX, dragY) {
        var newWeek = lo.convXToWeek(dragX);
        var newRev = lo.convYToFlow(dragY);
        m.setRevN(newWeek, newRev);
      };
    }}, function() {
      drawTooltip(ctx, lo, p1X, p1Y, 'Drag to change weekly revense growth rate');
    });

  }

  function drawExp() {
    var p0X = lo.convWeekToX(0);
    var p0Y = lo.convFlowToY(m.exp0);
    var p1X = lo.convWeekToX(m.nWeeks);
    var p1Y = lo.convFlowToY(m.expN);
    
    ctx.beginPath();
    ctx.moveTo(p0X, p0Y);
    ctx.lineTo(p1X, p1Y);
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(p0X, p0Y);
    ctx.rotate(Math.atan2(p1Y-p0Y, p1X-p0X));
    var label = fmtMoney(m.exp0, 10) + ' expense, growing ' + fmtGrowth(m.expGrowth) + ' weekly';
    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, 20, -4);
    ctx.restore();

    hd.add(p0X-lo.dragRad, p0Y-lo.dragRad, p0X+lo.dragRad, p0Y+lo.dragRad, function() {
      drawDragHandle(ctx, p0X, p0Y, lo.dragRad, 'exp');
    }, {onDown: function(hd, mdX, mdY) {
      hd.dragging = function(dragX, dragY) {
        var newExp = lo.convYToFlow(dragY);
        m.setExp0(newExp);
      };
    }}, function() {
      drawTooltip(ctx, lo, p0X, p0Y, 'Drag to change initial weekly expense');
    });

    hd.add(p1X-lo.dragRad, p1Y-lo.dragRad, p1X+lo.dragRad, p1Y+lo.dragRad, function() {
      drawDragHandle(ctx, p1X, p1Y, lo.dragRad, 'exp');
    }, {onDown: function(hd, mdX, mdY) {
      hd.dragging = function(dragX, dragY) {
        var newWeek = lo.convXToWeek(dragX);
        var newExp = lo.convYToFlow(dragY);
        m.setExpN(newWeek, newExp);
      };
    }}, function() {
      drawTooltip(ctx, lo, p1X, p1Y, 'Drag to change weekly expense growth rate');
    });
  }

  function drawBreakeven() {
    var p0X = lo.convWeekToX(m.breakevenWeek);
    var p0Y = lo.convFlowToY(m.breakevenFlow);
    var label = 'Breakeven in week ' + m.breakevenWeek.toFixed(0);
    
    ctx.moveTo(p0X, p0Y);
    ctx.lineTo(p0X, lo.plotB);
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = lo.thinWidth;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, p0X+5, p0Y+40);
    
  }

  function drawTitle(title, y) {
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, xStart+5, y);
  }
}
