const https = require('https');
const axios = require('axios');
const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class DashboardApi extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(DashboardApi.getDefaults(), options);
    super(options);
  }

  async updateStats() {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      const minerData = await axios.get(`${this.dashboard.baseUrl}/stats`, {httpsAgent: agent});
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

      let rates = coinGecko.getRates('ETH');
      const ethRate = rates.length > 0 ? rates[0] : null;
      rates = coinGecko.getRates('STORJ');
      const storjRate = rates.length > 0 ? rates[0] : null;
      if (ethRate) {
        result.totalEthFiat = parseFloat(ethRate.current_price) * result.totalEth;
      }
      if (storjRate) {
        result.totalStorjFiat = parseFloat(storjRate.current_price) * result.totalStorj;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Dashboard-API] => ${err.message}`);
    }
  }
};
