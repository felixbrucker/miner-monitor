const GenericWallet = require('./generic-wallet');
const coinGecko = require('../../rates/coingecko');

module.exports = class DiscWallet extends GenericWallet {

  constructor(options = {}) {
    options.dashboard.ticker = 'DISC';
    super(options);
  }

  async getDataForNewWallet() {
    const result = await super.getDataForNewWallet();
    result.syncProgress = 1;

    return result;
  }

  async updateStats() {
    const getDataForWallet = this.getDataForNewWallet.bind(this);
    try {
      const result = await getDataForWallet();

      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
        if (result.unconfirmed !== undefined) {
          result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        }
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Disc-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }
};
