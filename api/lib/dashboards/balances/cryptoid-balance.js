const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class CryptoidBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(CryptoidBalance.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      addr: this.dashboard.address,
      ticker: this.dashboard.ticker.toUpperCase(),
    });
  }

  async updateStats() {
    try {
      const balance = await util.getUrl(`https://chainz.cryptoid.info/${this.dashboard.ticker}/api.dws?q=getbalance&a=${this.dashboard.address}${this.dashboard.apiKey ? '&key=' + this.dashboard.apiKey : ''}`);
      const result = {
        balance,
      };
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), this.dashboard.ticker.toUpperCase());
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Cryptoid-Balance-API] => ${err.message}`);
    }
  }
};
