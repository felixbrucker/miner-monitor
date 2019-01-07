const nodeutil = require('util');
const coinbaseClient = require('coinbase').Client;
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class CoinbaseBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(CoinbaseBalance.getDefaults(), options);
    super(options);
  }

  async updateStats() {
    try {
      const getAccounts = nodeutil.promisify(this.client.getAccounts).bind(this.client);
      let accounts = await getAccounts({});
      accounts = accounts
        .map(account => ({
          name: account.name,
          ticker: account.currency,
          balance: parseFloat(account.balance.amount),
        }))
        .filter(account => account.balance > 0)
        .map(account => {
          const rates = coinGecko.getRates(account.ticker);
          const rate = rates.length > 0 ? rates[0] : null;
          if (rate) {
            account.balanceFiat = parseFloat(rate.current_price) * account.balance;
          }
          return account;
        });
      this.stats = accounts;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Coinbase-Balance-API] => ${err.message}`);
    }
  }

  async onInit() {
    const apiKeyAndSecret = this.dashboard.api_key.split(':');
    if (apiKeyAndSecret.length !== 2) {
      return console.error(`[${this.dashboard.name} :: Coinbase-Balance-API] => Invalid api key and secret key string, format is: 'api_key:api_secret'`);
    }
    this.client = new coinbaseClient({'apiKey': apiKeyAndSecret[0], 'apiSecret': apiKeyAndSecret[1]});
    super.onInit();
  }
};
