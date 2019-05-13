const util = require('../../util');
const GenericWallet = require('./generic-wallet');
const coinGecko = require('../../rates/coingecko');

module.exports = class BHDWallet extends GenericWallet {

  constructor(options = {}) {
    options.dashboard.ticker = 'BHD';
    super(options);
  }

  async getDataForNewWallet() {
    const result = await super.getDataForNewWallet();
    const { result: pledgeData } = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '2.0',
      id: 0,
      method: 'getpledge',
      params: [],
    });
    result.pledgeAmount = pledgeData.pledge || pledgeData.miningRequireBalance;
    result.pledgeCapacity = pledgeData.capacity;

    return result;
  }

  async updateStats() {
    const getDataForWallet = this.getDataForNewWallet.bind(this);
    try {
      const result = await getDataForWallet();

      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.find(rate => rate.id === 'bitcoin-hd');
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
        if (result.unconfirmed !== undefined) {
          result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        }
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: BHD-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }
};
