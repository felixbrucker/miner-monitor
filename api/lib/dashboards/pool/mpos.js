const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class Mpos extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(Mpos.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), { baseUrl: this.dashboard.baseUrl });
  }

  async updateStats() {
    try {
      let dashboardData = await util.getUrl(`${this.dashboard.baseUrl}/index.php?page=api&action=getdashboarddata&api_key=${this.dashboard.apiKey}&id=${this.dashboard.userId}`);
      dashboardData = dashboardData.getdashboarddata.data;
      let workerData = await util.getUrl(`${this.dashboard.baseUrl}/index.php?page=api&action=getuserworkers&api_key=${this.dashboard.apiKey}&id=${this.dashboard.userId}`);
      workerData = workerData.getuserworkers.data;
      let balanceData = await util.getUrl(`${this.dashboard.baseUrl}/index.php?page=api&action=getuserbalance&api_key=${this.dashboard.apiKey}&id=${this.dashboard.userId}`);
      balanceData = balanceData.getuserbalance.data;
      workerData = workerData
        .sort((a, b) => {
          if (a.username < b.username) return -1;
          if (a.username > b.username) return 1;
          return 0;
        })
        .filter((worker) => worker.hashrate !== 0)
        .map((worker) => {
          const arr = worker.username.split('.');
          worker.username = arr[(arr.length === 1 ? 0 : 1)];
          worker.hashrate = worker.hashrate / hrModifier;
          return worker;
        });

      const result = {
        hashrate: dashboardData.raw.personal.hashrate / hrModifier,
        symbol: dashboardData.pool.info.currency,
        estimated: dashboardData.personal.estimates.payout,
        workers: workerData,
        confirmed: balanceData.confirmed,
        unconfirmed: balanceData.unconfirmed,
      };

      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), result.symbol.toUpperCase());
      if (rate) {
        result.confirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.confirmed;
        result.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.unconfirmed;
        result.estimatedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.estimated;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: MPOS-API] => ${err.message}`);
    }
  }
};
