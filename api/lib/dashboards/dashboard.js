module.exports = class Dashboard {

  static getDefaults() {
    return {
      interval: 60 * 1000,
    };
  }

  constructor(options = {}) {
    this.stats = {};
    options = Object.assign(Dashboard.getDefaults(), options);
    this.dashboard = options.dashboard;
    this.interval = options.interval;
    this.onInit();
  }

  getStats() {
    return {
      name: this.dashboard.name,
      type: this.dashboard.type,
      enabled: this.dashboard.enabled,
      data: this.stats,
    };
  }

  async updateStats() {}

  cleanup() {
    if (this.runningInterval) {
      clearInterval(this.runningInterval);
      this.runningInterval = null;
    }
    this.stats = {};
  }

  onInit() {
    this.updateStats();
    this.runningInterval = setInterval(this.updateStats.bind(this), this.interval);
  }
};
