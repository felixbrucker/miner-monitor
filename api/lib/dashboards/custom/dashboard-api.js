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
      const nodes = minerData.data.data;
      const trainingCount = nodes.filter(node => node.state === 'training').length;
      const keepaliveCount = nodes.filter(node => node.state === 'keepalive').length;
      const graveyardCount = nodes.filter(node => node.state === 'graveyard').length;
      const removedCount = nodes.filter(node => node.state === 'removed').length;
      const balances = nodes.map(node => node.balances || {});
      const totalEth = balances.reduce((acc, obj) => obj.eth === undefined ? acc : acc + obj.eth, 0);
      const totalStorj = balances.reduce((acc, obj) => obj.storj === undefined ? acc : acc + obj.storj, 0);

      const result = {
        training: trainingCount,
        keepalive: keepaliveCount,
        graveyard: graveyardCount,
        removed: removedCount,
        total: nodes.length,
        totalEth,
        totalStorj,
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
