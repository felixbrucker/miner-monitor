const https = require('https');
const axios = require('axios');
const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class DashboardApi extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(DashboardApi.getDefaults(), options);
    super(options, coinmarketcap);
  }

  async updateStats() {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      const minerData = await axios.get(`${this.dashboard.baseUrl}/`, {httpsAgent: agent});
      const stats = minerData.data.data;
      const total = stats.trainingCount + stats.keepaliveCount + stats.graveyardCount + stats.removedCount;

      const result = {
        training: stats.trainingCount,
        keepalive: stats.keepaliveCount,
        graveyard: stats.graveyardCount,
        removed: stats.removedCount,
        total,
        totalEth: stats.totalEth,
        totalStorj: stats.totalStorj,
      };

      const ethRate = util.getRateForTicker(this.coinmarketcap.getRates(), 'ETH');
      const storjRate = util.getRateForTicker(this.coinmarketcap.getRates(), 'STORJ');
      if (ethRate) {
        result.totalEthFiat = parseFloat(util.getFiatForRate(ethRate, this.coinmarketcap.getCurrency())) * result.totalEth;
      }
      if (storjRate) {
        result.totalStorjFiat = parseFloat(util.getFiatForRate(storjRate, this.coinmarketcap.getCurrency())) * result.totalStorj;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Dashboard-API] => ${err.message}`);
    }
  }
};
