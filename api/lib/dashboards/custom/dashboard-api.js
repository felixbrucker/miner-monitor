const https = require('https');
const axios = require('axios');
const Dashboard = require('../dashboard');

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
      const minerData = await axios.get(`${this.dashboard.baseUrl}/`, {httpsAgent: agent});
      const nodes = minerData.data.data;
      const trainingCount = nodes.filter(node => node.state === 'training').length;
      const keepaliveCount = nodes.filter(node => node.state === 'keepalive').length;
      const graveyardCount = nodes.filter(node => node.state === 'graveyard').length;
      const removedCount = nodes.filter(node => node.state === 'removed').length;

      this.stats = {
        training: trainingCount,
        keepalive: keepaliveCount,
        graveyard: graveyardCount,
        removed: removedCount,
        total: nodes.length,
      };
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Dashboard-API] => ${err.message}`);
    }
  }
};
