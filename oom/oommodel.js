exports.OomModel = OomModel;


function OomModel(o) {
  var m = this;
  m.rev0 = o.rev0 ? o.rev0 : 200;
  m.revGrowth = o.revGrowth ? o.revGrowth : 0.02;
  m.exp0 = o.exp0 ? o.exp0 : 1600;
  m.expGrowth = 0.0;

  m.minFlow = 40;
  m.maxFlow = 2100000;
  m.showInstructions = 1.0;
  m.everDragged = false;

  m.nWeeks = 5 * 365.2425 / 7;
  m.calc();
}
OomModel.prototype = Object.create(EventEmitter.prototype);



OomModel.prototype.setRev0 = function(rev0) {
  var m = this;
  m.rev0 = rev0;
  m.calc();
};

OomModel.prototype.setExp0 = function(exp0) {
  var m = this;
  m.exp0 = exp0;
  m.calc();
};

OomModel.prototype.setRevN = function(week, revN) {
  var m = this;
  m.revGrowth = Math.exp(Math.log(revN / m.rev0) / week) - 1;
  m.calc();
};

OomModel.prototype.setExpN = function(week, expN) {
  var m = this;

  m.expGrowth = Math.exp(Math.log(expN / m.exp0) / week) - 1;
  m.calc();
};

OomModel.prototype.revAtWeek = function(week) {
  var m = this;

  return Math.exp(m.rev0Log + m.revLogGrowth * week);
};

OomModel.prototype.expAtWeek = function(week) {
  var m = this;

  return Math.exp(m.exp0Log + m.expLogGrowth * week);
};

OomModel.prototype.calc = function() {
  var m = this;

  m.rev0Log = Math.log(m.rev0);
  m.exp0Log = Math.log(m.exp0);
  m.revLogGrowth = Math.log(1 + m.revGrowth);
  m.expLogGrowth = Math.log(1 + m.expGrowth);

  m.revNLog = m.rev0Log + m.revLogGrowth * m.nWeeks;
  m.expNLog = m.exp0Log + m.expLogGrowth * m.nWeeks;

  m.revN = Math.exp(m.revNLog);
  m.expN = Math.exp(m.expNLog);
  
  /*
    solve for exp(rev0Log + n*revLogGrowth) === exp(exp0Log + n*expLogGrowth);
    n = (exp0Log - rev0Log) / (revLogGrowth - expLogGrowth)
  */
  m.breakevenWeek = (m.exp0Log - m.rev0Log) / (m.revLogGrowth - m.expLogGrowth);
  m.breakevenFlow = Math.exp(m.rev0Log + m.revLogGrowth * m.breakevenWeek);

  /*
    Integrate revenue from 0 to breakeven
  */
  m.breakevenTotRev = m.rev0 * (m.revLogGrowth === 0 ? m.breakevenWeek : ((Math.exp(m.revLogGrowth * m.breakevenWeek) - 1) / m.revLogGrowth));
  m.breakevenTotExp = m.exp0 * (m.expLogGrowth === 0 ? m.breakevenWeek : ((Math.exp(m.expLogGrowth * m.breakevenWeek) - 1) / m.expLogGrowth));
  m.capitalNeeded = m.breakevenTotExp - m.breakevenTotRev;

  // when will we make 100M / yr?
  m.ipoWeek = (Math.log(1e8/52) - m.rev0Log) / m.revLogGrowth;
};


OomModel.prototype.animate = function(dt) {
  var m = this;
  if (m.everDragged && m.showInstructions > 0) {
    m.showInstructions = Math.max(0, m.showInstructions - 0.8 * dt);
    m.emit('changed');
  }
};

