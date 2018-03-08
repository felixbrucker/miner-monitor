const moment = require('moment');
const util = require('../../util');
const GenericWallet = require('./generic-wallet');

module.exports = class HexxcoinWallet extends GenericWallet {

  constructor(options = {}, coinmarketcap) {
    options.dashboard.ticker = 'HXX';
    super(options, coinmarketcap);
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
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), this.dashboard.ticker);
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
        result.totalFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.total;
        result.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.unconfirmed;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Hexxcoin-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }
};
