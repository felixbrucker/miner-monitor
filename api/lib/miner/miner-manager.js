const https = require('https');
const axios = require('axios');
const Miner = require('./miner');
const problemService = require('../services/problem-service');

module.exports = class MinerManager extends Miner {

  async updateStats() {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      const minerData = await axios.get(`${this.device.hostname}/api/mining/stats`, {httpsAgent: agent});
      await problemService.handleProblem(this.constructOnlineProblem());
      await this.checkResult(minerData.data);
      this.stats = minerData.data.entries;
    } catch(err) {
      this.stats = null;
      console.error(`[${this.device.name} :: Miner-Manager] => ${err.message}`);
      await problemService.handleProblem(this.constructOfflineProblem());
    }
  }

  getStats() {
    return Object.assign(super.getStats(), {entries: this.stats});
  }

  async checkResult(result) {
    // check miner running
    const status = (result.entries && !Object.keys(result.entries).length) ? 'Problem' : 'OK';
    await problemService.handleProblem({
      type: 'item',
      status,
      descriptor: 'Number',
      item: {
        name: 'running miners',
        value: Object.keys(result.entries).length,
        highLow: 'low'
      },
      device: this.device,
    });

    // check temp if supported

    // check fan speed if supported
  }
};
