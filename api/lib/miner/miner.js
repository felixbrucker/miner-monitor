module.exports = class Miner {

  constructor(options = {}) {
    this.stats = {};
    this.device = options.device;
    this.interval = options.interval;
    this.onInit();
  }

  getStats() {
    return {
      type: this.device.type,
      name: this.device.name,
      hostname: this.device.hostname,
    };
  }

  async updateStats() {}

  constructOnlineProblem() {
    return {
      type: 'device',
      status: 'OK',
      device: this.device,
      text: 'Up',
    };
  }

  constructOfflineProblem() {
    return {
      type: 'device',
      status: 'Problem',
      device: this.device,
      text: 'Down',
    };
  }

  onInit() {
    this.updateStats();
    setInterval(this.updateStats.bind(this), this.interval);
  }
};