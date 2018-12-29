const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class WalletAgent extends Dashboard {

  static getDefaults() {
    return {
      interval: 2 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(WalletAgent.getDefaults(), options);
    super(options);
    this.stats = null;
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

      const rates = coinGecko.getRates(wallet.ticker);
      let rate = rates.length > 0 ? rates[0] : null;
      if (wallet.ticker.toUpperCase() === 'BHD') { // BHD is last
        rate = rates.find(rate => rate.id === 'bitcoin-hd');
      }

      if (rate) {
        wallet.data.balanceFiat = parseFloat(rate.current_price) * (wallet.data.balance || 0);
        wallet.data.unconfirmedFiat = parseFloat(rate.current_price) * (wallet.data.unconfirmed || 0);
        wallet.data.totalFiat = parseFloat(rate.current_price) * (wallet.data.total || 0);
      }
    });
  }
};
