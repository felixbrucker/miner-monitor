const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class Yiimp extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(Yiimp.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      baseUrl: this.dashboard.baseUrl,
      address: this.dashboard.address,
    });
  }

  async updateStats() {
    try {
      let statsData = await util.getUrl(`${this.dashboard.baseUrl}/api/walletEx?address=${this.dashboard.address}`);

      const result = {
        hashrate: null,
        symbol: statsData.currency,
        workers: statsData.miners || [],
        balance: statsData.balance,
        unconfirmed: statsData.unsold,
        paid24h: statsData.paid24h,
      };
      result.hashrate = result.workers.reduce((acc, right) => acc + right.accepted, 0);

      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), result.symbol.toUpperCase());
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
        result.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.unconfirmed;
        result.paid24hFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.paid24h;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Yiimp-API] => ${err.message}`);
    }
  }
};
