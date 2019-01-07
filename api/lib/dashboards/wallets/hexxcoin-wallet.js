const util = require('../../util');
const GenericWallet = require('./generic-wallet');
const coinGecko = require('../../rates/coingecko');

module.exports = class HexxcoinWallet extends GenericWallet {

  constructor(options = {}) {
    options.dashboard.ticker = 'HXX';
    super(options);
  }

  async getDataForNewWallet() {
    const result = await super.getDataForNewWallet();
    const xnodeData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'xnode',
      params: ['list-conf'],
    });
    result.nodes = xnodeData.result.map(node => {
      delete node.privateKey;
      return node;
    });

    return result;
  }

  async updateStats() {
    try {
      const result = await this.getDataForNewWallet();

      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
        result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Hexxcoin-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }
};
