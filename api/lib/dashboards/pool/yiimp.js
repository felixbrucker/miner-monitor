const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class Yiimp extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(Yiimp.getDefaults(), options);
    super(options);
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

      const rates = coinGecko.getRates(result.symbol);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        result.paid24hFiat = parseFloat(rate.current_price) * result.paid24h;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Yiimp-API] => ${err.message}`);
    }
  }
};
