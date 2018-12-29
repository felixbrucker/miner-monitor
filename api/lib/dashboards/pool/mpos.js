const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class Mpos extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(Mpos.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { baseUrl: this.dashboard.baseUrl });
  }

  async updateStats() {
    try {
      let dashboardData = await util.getUrl(`${this.dashboard.baseUrl}/index.php?page=api&action=getdashboarddata&api_key=${this.dashboard.api_key}&id=${this.dashboard.user_id}`);
      dashboardData = dashboardData.getdashboarddata.data;
      let workerData = await util.getUrl(`${this.dashboard.baseUrl}/index.php?page=api&action=getuserworkers&api_key=${this.dashboard.api_key}&id=${this.dashboard.user_id}`);
      workerData = workerData.getuserworkers.data;
      let balanceData = await util.getUrl(`${this.dashboard.baseUrl}/index.php?page=api&action=getuserbalance&api_key=${this.dashboard.api_key}&id=${this.dashboard.user_id}`);
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
          worker.hashrate = worker.hashrate / this.dashboard.hrModifier;
          return worker;
        });

      const result = {
        hashrate: dashboardData.raw.personal.hashrate / this.dashboard.hrModifier,
        symbol: dashboardData.pool.info.currency,
        estimated: dashboardData.personal.estimates.payout,
        workers: workerData,
        confirmed: parseFloat(balanceData.confirmed),
        unconfirmed: parseFloat(balanceData.unconfirmed),
      };

      const rates = coinGecko.getRates(result.symbol);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.confirmedFiat = parseFloat(rate.current_price) * result.confirmed;
        result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        result.estimatedFiat = parseFloat(rate.current_price) * result.estimated;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: MPOS-API] => ${err.message}`);
    }
  }
};
