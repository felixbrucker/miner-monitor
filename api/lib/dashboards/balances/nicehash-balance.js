const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class NicehashBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(NicehashBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://api.nicehash.com/api?method=balance&id=${this.dashboard.user_id}&key=${this.dashboard.api_key}`);
      const result = {
        balance: parseFloat(balanceData.result['balance_confirmed']),
      };

      const rates = coinGecko.getRates('BTC');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Nicehash-Balance-API] => ${err.message}`);
    }
  }
};
