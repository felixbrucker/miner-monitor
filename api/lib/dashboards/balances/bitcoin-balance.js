const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class BitcoinBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(BitcoinBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://blockchain.info/address/${this.dashboard.address}?format=json&limit=0`);
      const result = {
        balance: balanceData['final_balance'] / 100000000,
      };

      const rates = coinGecko.getRates('BTC');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Bitcoin-Balance-API] => ${err.message}`);
    }
  }
};
