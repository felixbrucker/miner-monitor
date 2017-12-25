const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class NicehashBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(NicehashBalance.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://api.nicehash.com/api?method=balance&id=${this.dashboard.user_id}&key=${this.dashboard.api_key}`);
      const result = {
        balance: balanceData.result['balance_confirmed'],
      };
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), 'BTC');
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Nicehash-Balance-API] => ${err.message}`);
    }
  }
};
