const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class BitcoinBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(BitcoinBalance.getDefaults(), options);
    super(options, coinmarketcap);
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
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), 'BTC');
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Bitcoin-Balance-API] => ${err.message}`);
    }
  }
};
