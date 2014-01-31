var _                   = require('underscore');
var assert              = require('assert');
var oommodel            = require('./oommodel');

describe('OomModel', function() {
  it('should work', function() {
    var m = new oommodel.OomModel({rev0: 200, revGrowth: 0.03, exp0: 2000, expGrowth: 0.0});
    if (0) console.log(m);
    assert.ok(Math.abs(m.revExpBreakeven - 2000) < 0.1);
    assert.ok(Math.abs(m.breakevenWeek - 77.90) < 0.1);

    m.setRevN(50000);
    if (0) console.log(m);
    assert.ok(Math.abs(m.revExpBreakeven - 2000) < 0.1);
    assert.ok(Math.abs(m.breakevenWeek - 65.06) < 0.1);
  });
});
