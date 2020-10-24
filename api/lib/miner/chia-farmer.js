const axios = require('axios');

const Miner = require('./miner');

module.exports = class ChiaFarmer extends Miner {
  onInit() {
    this.client = axios.create({
      baseURL: this.device.hostname,
    });
    super.onInit();
  }

  async updateStats() {
    try {
      const { data: challenges } = await this.client.post('/get_latest_challenges', {});
      const { data: connections } = await this.client.post('/get_connections', {});
      this.stats = {
        challenges: challenges.latest_challenges,
        connections: connections.connections,
      };
    } catch (err) {
      this.stats = null;
      console.error(`[${this.device.name} :: ChiaFarmer] => ${err.message}`);
    }
  }

  getStats() {
    return Object.assign(super.getStats(), { stats: this.stats });
  }
};
