module.exports = class Dashboard {

  static getDefaults() {
    return {
      interval: 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap = null) {
    this.stats = {};
    options = Object.assign(Dashboard.getDefaults(), options);
    this.dashboard = options.dashboard;
    this.interval = options.interval;
    this.coinmarketcap = coinmarketcap;
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

  onInit() {
    this.updateStats();
    setInterval(() => this.updateStats(), this.interval);
  }
};