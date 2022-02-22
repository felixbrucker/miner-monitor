const { CoinbasePro } = require('coinbase-pro-node');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class CoinbaseBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(CoinbaseBalance.getDefaults(), options);
    super(options);
  }

  async updateStats() {
    try {
      const accounts = await this.client.rest.account.listAccounts();
      this.stats = accounts
        .map(account => ({
          name: account.name,
          ticker: account.currency,
          balance: parseFloat(account.balance),
        }))
        .filter(account => (account.ticker !== 'EUR' && account.balance > 0.000001) || (account.ticker === 'EUR' && account.balance >= 0.01))
        .map(account => {
          const rates = coinGecko.getRates(account.ticker);
          const rate = rates.length > 0 ? rates[0] : null;
          if (rate) {
            account.balanceFiat = parseFloat(rate.current_price) * account.balance;
          }

          return account;
        });
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Coinbase-Balance-API] => ${err.message}`);
    }
  }

  async onInit() {
    const apiKeySecretAndPassphrase = this.dashboard.api_key.split(':');
    if (apiKeySecretAndPassphrase.length !== 3) {
      return console.error(`[${this.dashboard.name} :: Coinbase-Balance-API] => Invalid api key, secret key and passphrase string, format is: 'api_key:api_secret:passphrase'`);
    }
    this.client = new CoinbasePro({
      apiKey: apiKeySecretAndPassphrase[0],
      apiSecret: apiKeySecretAndPassphrase[1],
      passphrase: apiKeySecretAndPassphrase[2],
      useSandbox: false,
    });
    super.onInit();
  }
};
