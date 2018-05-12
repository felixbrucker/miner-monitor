const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class WalletAgent extends Dashboard {

  static getDefaults() {
    return {
      interval: 2 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(WalletAgent.getDefaults(), options);
    super(options, coinmarketcap);
  }

  async updateStats() {
    try {
      this.stats = await util.getUrl(`${this.dashboard.baseUrl}/stats`);
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Wallet-Agent-API] => ${err.message}`);
    }
    if (!this.stats) {
      return;
    }
    this.stats.map(wallet => {
      if (!wallet.data || Object.keys(wallet.data).length === 0) {
        return;
      }
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), wallet.ticker);
      if (rate) {
        wallet.data.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * (wallet.data.balance || 0);
        wallet.data.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * (wallet.data.unconfirmed || 0);
        wallet.data.totalFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * (wallet.data.total || 0);
      }
    });
  }
};
