
exports.OomModel = OomModel;


function OomModel(o) {
  var m = this;
  m.rev0 = o.rev0 ? o.rev0 : 200;
  m.revGrowth = o.revGrowth ? o.revGrowth : 0.03;
  m.exp0 = o.exp0 ? o.exp0 : 2000;
  m.expGrowth = 0.0;

  m.maxFlow = 1e5;

  m.nWeeks = 52*3;
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

OomModel.prototype.setRevN = function(revN) {
  var m = this;
  m.revGrowth = Math.exp(Math.log(revN / m.rev0) / m.nWeeks) - 1;
  m.calc();
};

OomModel.prototype.setExpN = function(expN) {
  var m = this;

  m.expGrowth = Math.exp(Math.log(expN / m.exp0) / m.nWeeks) - 1;
  m.calc();
};

OomModel.prototype.calc = function() {
  var m = this;
  m.revN = m.rev0 * Math.pow(m.revGrowth, m.nWeeks);
  m.expN = m.exp0 * Math.pow(m.expGrowth, m.nWeeks);
  
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
  m.revExpBreakeven = Math.exp(m.rev0Log + m.revLogGrowth * m.breakevenWeek);


};
