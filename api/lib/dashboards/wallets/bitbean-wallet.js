const moment = require('moment');
const util = require('../../util');
const GenericWallet = require('./generic-wallet');
const coinGecko = require('../../rates/coingecko');

module.exports = class BitbeanWallet extends GenericWallet {

  constructor(options = {}) {
    options.dashboard.ticker = 'BITB';
    super(options);
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
      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
        result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        result.stakedFiat = parseFloat(rate.current_price) * result.staked;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Bitbean-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }
};
