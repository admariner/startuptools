
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
            var m = new OomModel(o);
            window.oom0 = m;

            this.html('<div class="oomEditor"></div>' +
                      '<div class="oomVisualizer"></div>' +
                      '<div class="oomFooter"></div>');

            this.find('.oomEditor').fmtOomEditor(m);
            this.find('.oomVisualizer').fmtOomVisualizer(m);
            this.find('.oomFooter').fmtOomFooter();

            this.children().first().animation(function(nticks) {
              m.step();
              v.emit('redraw');
            });
          });

$.fn.fmtOomVisualizer = function(v) {
  this.html('<div class="oomVisPanel"><p class="oomPanelTitle">Metrics (weekly)</p>' +
            '<canvas class="oomVisCanvas" width="800" height="360"></canvas>' +
            '</div>').maximizeCanvasResolution();
  var dashCanvas = this.find('.oomVisCanvas');
  v.on('redraw', function() {
    drawOomDash(dashCanvas[0], v);
  });
  return this;
};

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
            '<span class=foot><hr width=165><a href="#about">About</a></span>' +
            '</center>');
  return this;
};


function cbrt(x) {
  if (x < 0) {
    return -Math.pow(-x, 1.0/3.0);
  } else {
    return Math.pow(x, 1.0/3.0);
  }
}

function drawOomDash(canvas, v) {
  var cw = canvas.width;
  var ch = canvas.height;
  var i, y;
  
  var ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, cw, ch);

  var xStart = 50;
  var xEnd = cw - 15;
  var xScale = (xEnd - xStart) / v.m.nWeeks;

  var xCurWeek = xStart + v.m.curWeek * xScale;
  
  if (!v.m.simComplete) {
    ctx.strokeStyle = '#ff8888';
    ctx.beginPath();
    ctx.moveTo(xCurWeek, 0);
    ctx.lineTo(xCurWeek, ch);
    ctx.stroke();
  }

  function drawAxes(y0, y1, y2) {
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(xStart, y0);
    ctx.lineTo(xEnd, y0);
    ctx.moveTo(xStart, y1);
    ctx.lineTo(xStart, y2);
    ctx.stroke();
  }
  function drawTitle(title, y) {
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, xStart+5, y);
  }
  function drawYUnits(label, y) {
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(xStart, y);
    ctx.lineTo(xStart-4, y);
    ctx.stroke();
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, xStart-7, y);
  }
  function drawXUnits(label, x, y) {
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y+4);
    ctx.stroke();
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y+7);
  }
  function drawCurve(weekly, yFunc, strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (i=0; i < v.m.curWeek; i++) {
      var xIndex = xStart + xScale * i;
      y = yFunc(weekly[i]);
      if (i === 0) {
        ctx.moveTo(xIndex, y);
      } else {
        ctx.lineTo(xIndex, y);
      }
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  var nRows = 2;

  if (1) {
    var yCashBase = 0.95 * ch / nRows;
    function yCashCompress(cash) {
      if (cash < 1e4 && cash > -1e4) return cash;
      if (cash > 0) return 1e4 * (1+Math.log(cash/1e4));
      if (cash < 0) return -1e4 * (1+Math.log(-cash/1e4));
    }
    var yCashScale = -0.9 * ch / nRows / yCashCompress(v.m.maxCash);
    function yCash(cash) {
      return yCashBase + yCashScale * yCashCompress(cash);
    }
    drawAxes(yCash(0), yCash(0), yCash(v.m.maxCash));
    drawTitle('Cash', yCash(v.m.maxCash));
    drawYUnits('0', yCash(0));
    if (v.m.maxCash >= 2e4) drawYUnits('20k', yCash(2e4));
    if (v.m.maxCash >= 5e4) drawYUnits('50k', yCash(5e4));
    if (v.m.maxCash >= 1e5) drawYUnits('100k', yCash(1e5));
    if (v.m.maxCash >= 1e6) drawYUnits('1M', yCash(1e6));
    if (v.m.maxCash >= 1e7) drawYUnits('10M', yCash(1e7));
    if (v.m.maxCash >= 1e8) drawYUnits('100M', yCash(1e8));
    drawCurve(v.m.cashHistory, yCash, '#008800');
  }

  if (1) {
    var yProfitBase = 1.9 * ch / nRows;
    function yProfitCompress(profit) {
      if (profit <= 1) return 0;
      return Math.log(profit);
    }
    var yProfitScale = -0.8 * ch / nRows / yProfitCompress(v.m.maxProfit);
    function yProfit(profit) {
      return yProfitBase + yProfitScale * yProfitCompress(profit);
    }
    drawAxes(yProfit(0), yProfit(-v.m.maxProfit), yProfit(v.m.maxProfit));
    drawTitle('Revenue & Expense', yProfit(v.m.maxProfit));
    drawYUnits('0', yProfit(0));
    if (v.m.maxProfit >= 1e3) {
      drawYUnits('+1k', yProfit(1e3));
    }
    if (v.m.maxProfit >= 1e4) {
      drawYUnits('+10k', yProfit(1e4));
    }
    if (v.m.maxProfit >= 1e5) {
      drawYUnits('+100k', yProfit(1e5));
    }
    drawCurve(v.m.revenueHistory, yProfit, '#008800');
    drawCurve(v.m.expenseHistory, yProfit, '#880000');
    
    drawXUnits('today', xStart, yProfitBase);
    drawXUnits('1yr', xStart + 1*52 * xScale, yProfitBase);
    drawXUnits('2yr', xStart + 2*52 * xScale, yProfitBase);
    drawXUnits('3yr', xStart + 3*52 * xScale, yProfitBase);
  }
}

function OomView(m, o) {
  this.m = m;
}

OomView.prototype = Object.create(EventEmitter.prototype);

