const axios = require('axios');

const Miner = require('./miner');

module.exports = class ChiaPlotter extends Miner {
  onInit() {
    this.client = axios.create({
      baseURL: `${this.device.hostname}/api`,
    });
    super.onInit();
  }

  async updateStats() {
    try {
      const { data: stats } = await this.client.get('stats');
      this.stats = stats;
    } catch (err) {
      console.error(`[${this.device.name} :: ChiaPlotter] => ${err.message}`);
    }
  }

  getStats() {
    return Object.assign(super.getStats(), { stats: this.stats });
  }
};
