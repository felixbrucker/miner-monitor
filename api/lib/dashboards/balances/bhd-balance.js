const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class BhdBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(BhdBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      addressUrl: `https://www.btchd.org/explorer/address/${this.dashboard.address}`,
      ticker: 'BHD',
      coin: 'Bitcoin HD',
    });
  }

  async updateStats() {
    try {
      const data = await util.getUrl(`https://www.btchd.org/explorer/api/v2/blockchain/address/${this.dashboard.address}`);
      const result = {
        balance: parseFloat(data.balance),
      };

      const rates = coinGecko.getRates('BHD');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: BHD-Balance-API] => ${err.message}`);
    }
  }
};
