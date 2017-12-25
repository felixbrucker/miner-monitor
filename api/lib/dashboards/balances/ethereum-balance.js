const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class EthereumBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(EthereumBalance.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://api.ethplorer.io/getAddressInfo/${this.dashboard.address}?apiKey=freekey`);
      const result = {
        eth: balanceData.ETH,
        tokens: balanceData.tokens,
      };
      result.eth.balance = result.eth.balance || 0;
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), 'ETH');
      if (rate) {
        result.eth.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.eth.balance;
      }
      result.tokens.forEach((token) => {
        token.balance = token.balance / (Math.pow(10, parseInt(token.tokenInfo.decimals)));
        const rate = util.getRateForTicker(this.coinmarketcap.getRates(), token.tokenInfo.symbol.toUpperCase());
        if (rate) {
          token.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * token.balance;
        }
      });
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Ethereum-Balance-API] => ${err.message}`);
    }
  }
};
