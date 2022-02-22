const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');
const { BitmartRestApi } = require('bitmart-api');

module.exports = class BitmartBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(BitmartBalance.getDefaults(), options);
    super(options);
  }

  onInit() {
    const apiNameAndKeyAndSecret = this.dashboard.api_key.split(':');
    if (apiNameAndKeyAndSecret.length > 3) {
      throw new Error('Invalid bitmart api name, key and secret given, please use the following format: api-name:api-key:api-secret');
    }
    this.client = new BitmartRestApi(
      apiNameAndKeyAndSecret[0],
      apiNameAndKeyAndSecret[1],
      apiNameAndKeyAndSecret[2]
    );
    super.onInit();
  }

  async updateStats() {
    try {
      const walletBalances = await this.client.getWalletBalances();
      walletBalances.forEach(balance => {
        balance.available = parseFloat(balance.available);
        balance.frozen = parseFloat(balance.frozen);
      });
      const nonZeroBalances = walletBalances.filter(balance => balance.available > 0.000001 || balance.frozen > 0.000001);
      nonZeroBalances.forEach(balance => {
        const rates = coinGecko.getRates(balance.id);
        const rate = rates.length > 0 ? rates[0] : null;
        if (rate) {
          balance.availableFiat = parseFloat(rate.current_price) * balance.available;
          balance.frozenFiat = parseFloat(rate.current_price) * balance.frozen;
        }
      });
      this.stats = nonZeroBalances;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Bitmart-Balance-API] => ${err.message}`);
    }
  }

  cleanup() {
    this.client.destroy();
    super.cleanup();
  }
};
