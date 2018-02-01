const moment = require('moment');
const util = require('../../util');
const GenericWallet = require('./generic-wallet');

module.exports = class BitbeanWallet extends GenericWallet {

  constructor(options = {}, coinmarketcap) {
    options.dashboard.ticker = 'BITB';
    super(options, coinmarketcap);
  }

  async getDataForOldWallet() {
    const result = await super.getDataForOldWallet();
    const sproutingData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getsproutinginfo',
      params: [],
    });
    result.sprouting = sproutingData.result.Enabled && sproutingData.result.Sprouting;
    if (result.sprouting) {
      result.sproutingInterval = moment.duration(sproutingData.result['Expected Time'], 'seconds').humanize();
    }

    return result;
  }

  async updateStats() {
    try {
      const result = await this.getDataForOldWallet();
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), this.dashboard.ticker);
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
        result.totalFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.total;
        result.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.unconfirmed;
        result.stakedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.staked;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Bitbean-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }
};
