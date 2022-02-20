const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class AllTheBlocksBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options.dashboard.coin = options.dashboard.api_key;
    options = Object.assign(AllTheBlocksBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      addressUrl: `https://alltheblocks.net/${this.dashboard.coin.toLowerCase()}/address/${this.dashboard.address}`,
      ticker: this.dashboard.ticker.toUpperCase(),
      coin: this.dashboard.coin,
    });
  }

  async updateStats() {
    try {
      const addressData = await util.getUrl(`https://api.alltheblocks.net/${this.dashboard.coin.toLowerCase()}/address/name/${this.dashboard.address}`);
      const result = {
        balance: addressData.balance / (10 ** this.dashboard.hrModifier),
      };

      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: AllTheBlocksBalance-API] => ${err.message}`);
    }
  }
};
