const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class CounterpartyBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(CounterpartyBalance.getDefaults(), options);
    super(options, coinmarketcap);
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
        const rate = util.getRateForTicker(this.coinmarketcap.getRates(), asset.asset.toUpperCase());
        if (rate) {
          asset.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * asset.balance;
        }
      });
      this.stats = balanceData.data;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Counterparty-Balance-API] => ${err.message}`);
    }
  }
};
