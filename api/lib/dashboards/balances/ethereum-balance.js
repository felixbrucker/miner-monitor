const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class EthereumBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(EthereumBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://api.ethplorer.io/getAddressInfo/${this.dashboard.address}?apiKey=freekey`);
      const result = {
        eth: balanceData.ETH,
        tokens: balanceData.tokens || [],
      };
      result.eth.balance = result.eth.balance || 0;

      const rates = coinGecko.getRates('ETH');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.eth.balanceFiat = parseFloat(rate.current_price) * result.eth.balance;
      }
      result.tokens.forEach((token) => {
        token.balance = token.balance / (Math.pow(10, parseInt(token.tokenInfo.decimals)));

        const rates = coinGecko.getRates(token.tokenInfo.symbol);
        const rate = rates.length > 0 ? rates[0] : null;
        if (rate) {
          token.balanceFiat = parseFloat(rate.current_price) * token.balance;
        }
      });

      this.stats = result;
    } catch(err) {
      if (err.message === 'Request failed with status code 429') {
        await util.sleep(3);
        return this.updateStats();
      }
      console.error(`[${this.dashboard.name} :: Ethereum-Balance-API] => ${err.message}`);
    }
  }
};
