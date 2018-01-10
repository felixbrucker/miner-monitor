const moment = require('moment');
const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class NodeCryptonotePool extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(NodeCryptonotePool.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), { baseUrl: this.dashboard.baseUrl });
  }

  async updateStats() {
    try {
      const dashboardData = await util.getUrl(`${this.dashboard.baseUrl}/stats_address?address=${this.dashboard.address}&longpoll=false`);
      const liveStats = await util.getUrl(`${this.dashboard.baseUrl}/stats`);

      if (dashboardData.error) {
        this.stats = {
          hashrate: '0 H',
          pending: 0,
          paid: 0,
          lastShareSubmitted: 'never',
          estimatedProfit: 0,
          lastBlockFound: moment(parseInt(liveStats.pool.lastBlockFound, 10)).fromNow(),
          pendingFiat: 0,
          paidFiat: 0,
          estimatedProfitFiat: 0,
        };

        throw new Error(dashboardData.error);
      }

      const reward = liveStats.network.reward / liveStats.config.coinUnits;
      const daysToFindBlock = (liveStats.network.difficulty / util.parseHashrate(dashboardData.stats.hashrate || '0')) / (60 * 60 * 24);
      const estimatedDailyProfit = reward / daysToFindBlock;

      const result = {
        hashrate: dashboardData.stats.hashrate || 0,
        symbol: liveStats.config.symbol.toUpperCase(),
        pending: dashboardData.stats.balance ? dashboardData.stats.balance / liveStats.config.coinUnits  : 0,
        paid: dashboardData.stats.paid ? dashboardData.stats.paid / liveStats.config.coinUnits  : 0,
        lastShareSubmitted: moment.unix(dashboardData.stats.lastShare).fromNow(),
        estimatedProfit: estimatedDailyProfit,
        lastBlockFound: moment(parseInt(liveStats.pool.lastBlockFound, 10)).fromNow(),
      };

      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), result.symbol);
      if (rate) {
        result.pendingFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.pending;
        result.paidFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.paid;
        result.estimatedProfitFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.estimatedProfit;
    }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Node-Cryptonote-Pool-API] => ${err.message}`);
    }
  }
};
