const IO = require('socket.io-client');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class HDPoolControl extends Dashboard {
  onInit() {
    this.stats = [];
    this.client = IO(`${this.dashboard.baseUrl}/web-ui`);

    this.client.on('connect', this.initStats.bind(this));
    this.client.on('stats/account', this.onNewAccountStats.bind(this));
  }

  initStats() {
    this.client.emit('stats/init', this.onStats.bind(this));
  }

  onStats(accounts) {
    this.stats = accounts;
  }

  onNewAccountStats(accountName, accountStats) {
    const stats = this.stats;
    if (!stats) {
      return;
    }
    const account = stats.find(account => account.name === accountName);
    if (!account) {
      return;
    }
    Object.keys(accountStats).forEach(key => {
      account[key] = accountStats[key];
    });
  }

  cleanup() {
    this.client.disconnect();
    super.cleanup();
  }
};
