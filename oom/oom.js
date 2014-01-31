



function OomModel(o) {
  this.revenue0 = o.revenue0 ? o.revenue0 : 200;
  this.growth = o.growth ? o.growth : 0.03;
  this.expense = o.expense ? o.expense : 2000;
  this.cash0 = o.cash0 ? o.cash0 : 100000;

  this.maxCash = 1e6;
  this.maxProfit = 1e5;

  this.nWeeks = 52*3;
  this.setup();
}

OomModel.prototype.setup = function() {
  this.simComplete = false;
  this.curWeek = 0;
  this.curCash = this.cash0;
  this.curRevenue = this.revenue0;
  
  this.profitHistory = [];
  this.cashHistory = [];
  this.revenueHistory = [];
  this.expenseHistory = [];

  this.disaster = false;
  this.success = false;
};

OomModel.prototype.step = function() {

  if (this.simComplete) return;

  this.curProfit = this.curRevenue - this.expense;
  this.curCash = this.curCash + this.curProfit;
  this.curRevenue = this.curRevenue * (1 + this.growth);

  this.revenueHistory.push(this.curRevenue);
  this.expenseHistory.push(this.expense);
  this.profitHistory.push(this.curProfit);
  this.cashHistory.push(this.curCash);

  this.curWeek += 1;
  if (this.curCash < 0) {
    this.disaster = true;
  }
  else if (this.curCash > this.maxCash) {
    this.success = true;
    this.simComplete = true;
  }
  if (this.curWeek >= this.nWeeks) {
    this.simComplete = true;
  }
};
