const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class CounterpartyBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(CounterpartyBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://xchain.io/api/balances/${this.dashboard.address}`);
      balanceData.data.forEach((asset) => {
        asset.balance = parseFloat(asset.quantity);
        delete asset.quantity;

        const rates = coinGecko.getRates(asset.asset);
        const rate = rates.length > 0 ? rates[0] : null;
        if (rate) {
          asset.balanceFiat = parseFloat(rate.current_price) * asset.balance;
        }
      });
      this.stats = balanceData.data;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Counterparty-Balance-API] => ${err.message}`);
    }
  }
};
