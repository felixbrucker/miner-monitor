const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class CryptoidBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(CryptoidBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      addr: this.dashboard.address,
      ticker: this.dashboard.ticker.toUpperCase(),
    });
  }

  async updateStats() {
    try {
      const balance = await util.getUrl(`https://chainz.cryptoid.info/${this.dashboard.ticker}/api.dws?q=getbalance&a=${this.dashboard.address}${this.dashboard.api_key ? '&key=' + this.dashboard.api_key : ''}`);
      const result = {
        balance,
      };

      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Cryptoid-Balance-API] => ${err.message}`);
    }
  }
};
