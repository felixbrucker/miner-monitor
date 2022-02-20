const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class SignumBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(SignumBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      addressUrl: `https://explorer.signum.network/search/?q=${this.dashboard.address}&submit=Search`,
      ticker: 'SIGNA',
      coin: 'Signum',
    });
  }

  async updateStats() {
    try {
      const data = await util.getUrl(`https://europe.signum.network/burst?requestType=getAccount&account=${this.dashboard.address}`);
      const result = {
        balance: data.balanceNQT / 100000000,
      };

      const rates = coinGecko.getRates('SIGNA');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: SIGNUM-Balance-API] => ${err.message}`);
    }
  }
};
