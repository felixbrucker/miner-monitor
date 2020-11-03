const axios = require('axios');

const Miner = require('./miner');

module.exports = class ChiaArchiver extends Miner {
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
      this.stats = null;
      console.error(`[${this.device.name} :: ChiaArchiver] => ${err.message}`);
    }
  }

  getStats() {
    return Object.assign(super.getStats(), { stats: this.stats });
  }
};
