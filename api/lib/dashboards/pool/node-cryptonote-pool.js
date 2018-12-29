const moment = require('moment');
const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class NodeCryptonotePool extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(NodeCryptonotePool.getDefaults(), options);
    super(options);
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
          hashrate: 0,
          pending: 0,
          paid: 0,
          lastShareSubmitted: 'never',
          estimatedProfit: 0,
          lastBlockFound: moment(parseInt(liveStats.pool.lastBlockFound, 10)).fromNow(),
          pendingFiat: 0,
          paidFiat: 0,
          estimatedProfitFiat: 0,
          symbol: liveStats.config.symbol.toUpperCase(),
        };
        return;
      }

      const hashrate = util.parseHashrate(dashboardData.stats.hashrate || '0 H');

      const reward = liveStats.network.reward / liveStats.config.coinUnits;
      const daysToFindBlock = (liveStats.network.difficulty / hashrate) / (60 * 60 * 24);
      const estimatedDailyProfit = reward / daysToFindBlock;

      const result = {
        hashrate,
        symbol: liveStats.config.symbol.toUpperCase(),
        pending: dashboardData.stats.balance ? dashboardData.stats.balance / liveStats.config.coinUnits  : 0,
        paid: dashboardData.stats.paid ? dashboardData.stats.paid / liveStats.config.coinUnits  : 0,
        lastShareSubmitted: moment.unix(dashboardData.stats.lastShare).fromNow(),
        estimatedProfit: estimatedDailyProfit,
        lastBlockFound: moment(parseInt(liveStats.pool.lastBlockFound, 10)).fromNow(),
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
      console.error(`[${this.dashboard.name} :: Node-Cryptonote-Pool-API] => ${err.message}`);
    }
  }
};
