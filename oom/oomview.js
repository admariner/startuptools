/*
  Makes a full-page display of startup revenue, expense, growth, and capital needed.
  It's all one canvas with draggable bits.
  The actual math is in oommodel.js

  See tlbcore doc for $.defPages, $.mkAnimatedCanvas
*/

var oommodel            = require('./oommodel');

$.defPages('', 
          function(rest) {
            var rs = rest.split('_');
            console.log('Parse', rs);
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

            top.find('.oomCanvas').mkAnimatedCanvas(m, drawOom, {});
            top.find('.oomFooter').fmtOomFooter();

            top.children().first().bogartWindowEvents({
              'resize': onWindowResize,
              'keydown': onWindowKeydown
            });

            m.on('changed', function() {
              top.setHash('_' + m.rev0.toFixed(1) + '_' + m.exp0.toFixed(1) + '_' + m.revGrowth.toFixed(6) + '_' + m.expGrowth.toFixed(6));
            });

            getSizes();
            adjustSizes();
            top.animation2(m);
            m.emit('changed');
            return this;

            function onWindowKeydown(ev) {
              // WRITEME: 
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
            
            /*
              Because I can't figure out how to make full-page layouts in CSS.
             */
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
            }
          });

$.fn.fmtOomFooter = function(o) {
  this.html('<center>' +
            '<!-- <span class="foot"><a href="#about">About</a></span> -->' +
            '</center>');
  return this;
};

/*
  Formatters
*/

function fmtWeek(week) {
  return 'week ' + week.toFixed(0);
}

function fmtYear(week) {
  return 'year ' + (week / weeksPerYear).toFixed(1);
}

function fmtMoney(v, digits) {
  var powDigits = Math.pow(10, digits);
  if (v >= 100e12) { // Don't show silly numbers
    return 'Unreasonable';
  }
  if (v >= 1000000000000*powDigits) {
    return '$' + (v/1000000000000).toFixed(0) + 'T';
  }
  if (v >= 1000000000000) {
    return '$' + (v/1000000000000).toFixed(digits-1) + 'T';
  }
  if (v >= 1000000000*powDigits) {
    return '$' + (v/1000000000).toFixed(0) + 'B';
  }
  if (v >= 1000000000) {
    return '$' + (v/1000000000).toFixed(digits-1) + 'B';
  }
  if (v >= 1000000*powDigits) {
    return '$' + (v/1000000).toFixed(0) + 'M';
  }
  if (v >= 1000000) {
    return '$' + (v/1000000).toFixed(digits-1) + 'M';
  }
  if (v >= 1000*powDigits) {
    return '$' + (v/1000).toFixed(0) + 'k';
  }
  if (v >= 1000) {
    return '$' + (v/1000).toFixed(digits-1) + 'k';
  }
  return '$' + v.toFixed(0);
}

var weeksPerYear = 365.2425 / 7;
var weeksPerMonth = 365.2425 / 7 / 12;

function weekToMonth(week) {
  return week / weeksPerMonth;
}

function weekToMonthGrowth(weeklyGrowth) {
  return Math.exp(Math.log(1+weeklyGrowth) * weeksPerMonth)-1;
}

function fmtGrowth(v) {
  return (v*100).toFixed(1) + '%';
}

/*
  Canvas drawing helpers
*/

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

/*
  Draw everything in the canvas (through ctx), and associate callbacks with clickable 
  or draggable areas.

  This gets called whenever something changes (but by using requestAnimationFrame, 
  only once per screen refresh) and it redraws everything from scratch.

  m: an OomModel
  ctx: an HTML5 2D canvas rendering context.
  hd: a HitDetector (from tlbcore)
  lo: a layout object, containing at least {boxL, boxT, boxR, boxB} for the canvas dimensions
  o: options, not used here
*/
function drawOom(m, ctx, hd, lo, o) {
  
  setupLayout();
  drawInstructions();
  drawAxes();
  drawCapital();
  drawExp();
  drawRev();
  drawBreakeven();
  drawIpo();
  drawXLabels();
  drawYLabels();
  return;

  function setupLayout() {
    /*
      Leave some margins around the plot for axis labels etc.
     */
    lo.labelW = 50;
    var pL = lo.boxL+5;
    var pR = lo.boxR-5;
    if (m.showMonthly) {
      pR -= lo.labelW;
      lo.monthlyAxisR = pR;
    }
    if (m.showWeekly) {
      pL += lo.labelW;
      lo.weeklyAxisL = pL;
    }
    if (m.showMonthly) {
      pL += lo.labelW;
      lo.monthlyAxisL = pL;
    }
    if (m.showWeekly) {
      pR -= lo.labelW;
      lo.weeklyAxisR = pR;
    }
    lo.plotL = pL;
    lo.plotR = pR;
    lo.plotT = lo.boxT + 45;
    lo.plotB = lo.boxB - 30;
    lo.dragRad = 6;

    /*
      These functions, which had better be correct inverses of each other, define the X and Y scaling of the plot
     */
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
  }

  function drawAxes() {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = lo.thinWidth;
    ctx.beginPath();
    ctx.moveTo(lo.plotL, lo.plotB);
    ctx.lineTo(lo.plotR, lo.plotB);
    ctx.stroke();
  }

  function drawXLabels() {
    ctx.font = '12px Arial';
    for (var week=0, year=0; week <= m.nWeeks; week+=weeksPerYear, year += 1) {
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
    }
  }

  function drawYLabels() {
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Revenue/Expense', lo.boxL, lo.plotT-30);

    if (m.showWeekly) {
      ctx.beginPath();
      ctx.moveTo(lo.weeklyAxisL, lo.plotB);
      ctx.lineTo(lo.weeklyAxisL, lo.plotT);
      ctx.moveTo(lo.weeklyAxisR, lo.plotB);
      ctx.lineTo(lo.weeklyAxisR, lo.plotT);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = lo.thinWidth;
      ctx.stroke();

      ctx.font = '12px Arial';
      ctx.textBaseline = 'middle';
      _.each([1,3], function(flow) {
        while (flow < m.minFlow) flow *= 10;
        while (flow <= m.maxFlow) {
          var label = fmtMoney(flow, 1);
          var flowY = lo.convFlowToY(flow);

          ctx.beginPath();
          ctx.moveTo(lo.weeklyAxisL, flowY);
          ctx.lineTo(lo.weeklyAxisL-7, flowY);
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = lo.thinWidth;
          ctx.stroke();
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lo.weeklyAxisL-10, flowY);
          
          ctx.beginPath();
          ctx.moveTo(lo.weeklyAxisR, flowY);
          ctx.lineTo(lo.weeklyAxisR+7, flowY);
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = lo.thinWidth;
          ctx.stroke();
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lo.weeklyAxisR+10, flowY);
          
          flow *= 10;
        }
      });
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Weekly', lo.weeklyAxisL, lo.plotT-8);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Weekly', lo.weeklyAxisR, lo.plotT-8);
    }
    if (m.showMonthly) {
      ctx.beginPath();
      ctx.moveTo(lo.monthlyAxisL, lo.plotB);
      ctx.lineTo(lo.monthlyAxisL, lo.plotT);
      ctx.moveTo(lo.monthlyAxisR, lo.plotB);
      ctx.lineTo(lo.monthlyAxisR, lo.plotT);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = lo.thinWidth;
      ctx.stroke();

      ctx.font = '12px Arial';
      _.each([1,3], function(monthlyFlow) {
        var flow = monthlyFlow / weeksPerMonth;
        while (flow < m.minFlow) {flow *= 10; monthlyFlow *= 10; }
        while (flow <= m.maxFlow) {
          var label = fmtMoney(monthlyFlow, 1);
          var flowY = lo.convFlowToY(flow);

          ctx.beginPath();
          ctx.moveTo(lo.monthlyAxisL, flowY);
          ctx.lineTo(lo.monthlyAxisL-7, flowY);
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = lo.thinWidth;
          ctx.stroke();
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lo.monthlyAxisL-10, flowY);
          
          ctx.beginPath();
          ctx.moveTo(lo.monthlyAxisR, flowY);
          ctx.lineTo(lo.monthlyAxisR+7, flowY);
          ctx.strokeStyle = '#888888';
          ctx.lineWidth = lo.thinWidth;
          ctx.stroke();
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, lo.monthlyAxisR+10, flowY);
          
          flow *= 10;
          monthlyFlow *= 10;
        }
      });

      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Monthly', lo.monthlyAxisL, lo.plotT-8);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Monthly', lo.monthlyAxisR, lo.plotT-8);
    }
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
    ctx.font = '15px Arial';
    var label = m.capitalNeeded >= 0 ? (fmtMoney(m.capitalNeeded, 2) + ' capital needed') : 'Infinite capital needed';
    var labelW = ctx.measureText(label).width;
    var lbWeek = m.breakevenWeek > 0 ? Math.min(20, m.breakevenWeek / 4) : 20;
    var lbX = Math.max(lo.plotL + labelW/2, lo.convWeekToX(lbWeek));
    var lbY = (lo.convFlowToY(m.revAtWeek(lbWeek)) + lo.convFlowToY(m.expAtWeek(lbWeek))) / 2;

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, lbX, lbY);
  }

  function drawRev() {
    var p0X = lo.convWeekToX(0);
    var p0Y = lo.convFlowToY(m.rev0);
    var p1Week = Math.min(m.nWeeks, m.ipoWeek);
    var p1X = lo.convWeekToX(p1Week);
    var p1Y = lo.convFlowToY(m.revAtWeek(p1Week));
    
    ctx.beginPath();
    ctx.moveTo(p0X, p0Y);
    ctx.lineTo(p1X, p1Y);
    ctx.strokeStyle = '#00cc00';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(p0X, p0Y);
    ctx.rotate(Math.atan2(p1Y-p0Y, p1X-p0X));
    var labels = [fmtMoney(m.rev0, 2) + ' weekly growing ' + fmtGrowth(m.revGrowth),
                  fmtMoney(m.rev0 * weeksPerMonth, 2) + ' monthly growing ' + fmtGrowth(weekToMonthGrowth(m.revGrowth))];

    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    _.each(labels, function(label, labeli) {
      ctx.fillText(label, 20, +4 + 18*labeli);
    });
    ctx.restore();

    hd.add(p0X-lo.dragRad, p0Y-lo.dragRad, p0X+lo.dragRad, p0Y+lo.dragRad, {
      draw: function() {
        drawDragHandle(ctx, p0X, p0Y, lo.dragRad, 'rev');
      },
      onDown: function(mdX, mdY) {
        hd.dragging = function(dragX, dragY) {
          var newRev = lo.convYToFlow(dragY);
          m.setRevAtWeek(0, newRev);
          m.everDragged = true;
        };
      },
      onHover: function() {
        drawTooltip(ctx, lo, p0X, p0Y, 'Drag to change initial weekly revense');
      }});

    hd.add(p1X-lo.dragRad, p1Y-lo.dragRad, p1X+lo.dragRad, p1Y+lo.dragRad, {
      draw: function() {
        drawDragHandle(ctx, p1X, p1Y, lo.dragRad, 'rev');
      }, 
      onDown: function(mdX, mdY) {
        hd.dragging = function(dragX, dragY) {
          var newWeek = lo.convXToWeek(dragX);
          var newRev = lo.convYToFlow(dragY);
          m.setRevAtWeek(newWeek, newRev);
          m.everDragged = true;
        };
      }, 
      onHover: function() {
        drawTooltip(ctx, lo, p1X, p1Y, 'Drag to change weekly revense growth rate');
      }});
  }

  function drawExp() {
    var p0X = lo.convWeekToX(0);
    var p0Y = lo.convFlowToY(m.exp0);
    var p1Week = m.nWeeks;
    var p1X = lo.convWeekToX(p1Week);
    var p1Y = lo.convFlowToY(m.expAtWeek(p1Week));
    
    ctx.beginPath();
    ctx.moveTo(p0X, p0Y);
    ctx.lineTo(p1X, p1Y);
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.translate(p0X, p0Y);
    ctx.rotate(Math.atan2(p1Y-p0Y, p1X-p0X));

    var labels = [fmtMoney(m.exp0, 2) + ' weekly growing ' + fmtGrowth(m.expGrowth),
                  fmtMoney(m.exp0 * weeksPerMonth, 2) + ' monthly growing ' + fmtGrowth(weekToMonthGrowth(m.expGrowth))];
    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    _.each(labels, function(label, labeli) {
      ctx.fillText(label, 20, -4 - 18*(1-labeli));
    });
    ctx.restore();

    hd.add(p0X-lo.dragRad, p0Y-lo.dragRad, p0X+lo.dragRad, p0Y+lo.dragRad, {
      draw: function() {
        drawDragHandle(ctx, p0X, p0Y, lo.dragRad, 'exp');
      },
      onDown: function(mdX, mdY) {
        hd.dragging = function(dragX, dragY) {
          var newExp = lo.convYToFlow(dragY);
          m.setExpAtWeek(0, newExp);
          m.everDragged = true;
        };
      },
      onHover: function() {
        drawTooltip(ctx, lo, p0X, p0Y, 'Drag to change initial weekly expense');
      }});

    hd.add(p1X-lo.dragRad, p1Y-lo.dragRad, p1X+lo.dragRad, p1Y+lo.dragRad, {
      draw: function() {
        drawDragHandle(ctx, p1X, p1Y, lo.dragRad, 'exp');
      },
      onDown: function(mdX, mdY) {
        hd.dragging = function(dragX, dragY) {
          var newWeek = lo.convXToWeek(dragX);
          var newExp = lo.convYToFlow(dragY);
          m.setExpAtWeek(newWeek, newExp);
          m.everDragged = true;
        };
      },
      onHover: function() {
        drawTooltip(ctx, lo, p1X, p1Y, 'Drag to change weekly expense growth rate');
      }});
  }

  function drawBreakeven() {
    if (m.breakevenWeek < 0 || m.breakevenWeek > 30*52) return;

    var label = 'Breakeven at ' + fmtYear(m.breakevenWeek);
    var drawArrow = lo.convWeekToX(m.breakevenWeek) > lo.plotR;
    
    if (drawArrow) {
      var p0X = lo.plotR;
      var p0Y = lo.convFlowToY(m.breakevenFlow);
      var p1X = lo.plotR-20;
      var p1Y = Math.min(p0Y, lo.convFlowToY(m.expN)-10);
    
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p1X, p1Y);
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p0X-8, p0Y-3);
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p0X-8, p0Y+3);
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = '15px Arial';
      var labelW = ctx.measureText(label).width

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillText(label, p1X-5, p1Y);
    } else {
      var p0X = lo.convWeekToX(m.breakevenWeek);
      var p0Y = lo.convFlowToY(m.breakevenFlow);
      var p1X = lo.convWeekToX(m.breakevenWeek);
      var p1Y = p0Y+20;
      
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p1X, p1Y);
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = '15px Arial';
      var labelW = ctx.measureText(label).width
      if (p1X + labelW + 10 > lo.plotR) {
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.fillText(label, p1X+3, p1Y);
      } else {
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillText(label, p1X-3, p1Y);
      }
    }
  }

  function drawIpo() {
    if (m.ipoWeek < 0 || m.ipoWeek > 30*52) return;

    var drawArrow = lo.convWeekToX(m.ipoWeek) > lo.plotR;
    var p0X = drawArrow ? lo.plotR : lo.convWeekToX(m.ipoWeek);
    var p0Y = lo.convFlowToY(m.revAtWeek(m.ipoWeek));
    var label = '$100M/yr revenue at ' + fmtYear(m.ipoWeek);
    var p1X = Math.min(lo.plotR-20, p0X-20);
    var p1Y = p0Y;
    
    ctx.moveTo(p0X, p0Y);
    ctx.lineTo(p1X, p1Y);
    if (drawArrow) {
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p0X-8, p0Y-3);
      ctx.moveTo(p0X, p0Y);
      ctx.lineTo(p0X-8, p0Y+3);
    }
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = '15px Arial';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillText(label, p1X-5, p1Y);
  }

  function drawInstructions() {
    if (!(m.showInstructions > 0)) return;
    var cX = (lo.plotL + lo.plotR)/2;
    var lY = lo.plotT + 100;

    ctx.save();
    ctx.globalAlpha = (1 - Math.cos(m.showInstructions*Math.PI)) / 2;

    ctx.font = '25px Arial';
    lines=[
      'How much money will you burn before your startup is profitable?',
      'Drag the red and green handles to change expense and revenue',
      'The shaded blue area shows how much money you\'ll need'
    ];
    var linesW = 100;
    _.each(lines, function(line) { 
      linesW = Math.max(linesW, ctx.measureText(line).width);
    });

    drawRountangle(ctx, cX-linesW/2-20, lY-30, cX+linesW/2+20, lY+(lines.length-1)*35+30, 10);
    ctx.fillStyle = '#ffcc66';
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    _.each(lines, function(line, linei) {
      ctx.fillText(line, cX, lY + linei*35);
    });

    ctx.restore();
  }
}
