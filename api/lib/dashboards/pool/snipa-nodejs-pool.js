const moment = require('moment');
const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class SnipaNodejsPool extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(SnipaNodejsPool.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { baseUrl: this.dashboard.baseUrl });
  }

  async updateStats() {
    try {
      const dashboardData = await util.getUrl(`${this.dashboard.baseUrl}/api/miner/${this.dashboard.address}/stats`);
      const networkStats = await util.getUrl(`${this.dashboard.baseUrl}/api/network/stats`);
      const poolStats = await util.getUrl(`${this.dashboard.baseUrl}/api/pool/stats`);


      if (dashboardData.lastHash === null) {
        this.stats = {
          hashrate: 0,
          pending: 0,
          paid: 0,
          lastShareSubmitted: 'never',
          estimatedProfit: 0,
          lastBlockFound: moment.unix(poolStats.pool_statistics.lastBlockFoundTime).fromNow(),
          pendingFiat: 0,
          paidFiat: 0,
          estimatedProfitFiat: 0,
          symbol: this.dashboard.ticker.toUpperCase(),
        };
        return;
      }

      const reward = networkStats.value / Math.pow(10, 8);
      const daysToFindBlock = (networkStats.difficulty / (dashboardData.hash || 0)) / (60 * 60 * 24);
      const estimatedDailyProfit = reward / daysToFindBlock;

      const result = {
        hashrate: dashboardData.hash || 0,
        symbol: this.dashboard.ticker.toUpperCase(),
        pending: (dashboardData.amtDue ? (dashboardData.amtDue / Math.pow(10, 8)) : 0) * (this.dashboard.hrModifier || 1),
        paid: (dashboardData.amtPaid ? (dashboardData.amtPaid / Math.pow(10, 8)) : 0) * (this.dashboard.hrModifier || 1),
        lastShareSubmitted: moment.unix(dashboardData.lastHash).fromNow(),
        estimatedProfit: estimatedDailyProfit * (this.dashboard.hrModifier || 1),
        lastBlockFound: moment.unix(poolStats.pool_statistics.lastBlockFoundTime).fromNow(),
      };

      const rates = coinGecko.getRates(result.symbol);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.pendingFiat = parseFloat(rate.current_price) * result.pending;
        result.paidFiat = parseFloat(rate.current_price) * result.paid;
        result.estimatedProfitFiat = parseFloat(rate.current_price) * result.estimatedProfit;
    }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Snipa-Nodejs-Pool-API] => ${err.message}`);
    }
  }
};
