const util = require('../util');

module.exports = class Coinmarketcap {

  static getDefaults() {
    return {
      interval: 5 * 60 * 1000,
      currency: 'EUR',
      currencySymbol: '€',
    };
  }

  constructor(options = {}) {
    this.rates = [];
    options = Object.assign(Coinmarketcap.getDefaults(), options);
    this.interval = options.interval;
    this.currency = options.currency;
    this.currencySymbol = options.currencySymbol;
    this.onInit();
  }

  getRates() {
    return this.rates;
  }

  getCurrency() {
    return this.currency;
  }

  getCurrencySymbol() {
    return this.currencySymbol;
  }

  async updateRates() {
    try {
      this.rates = await util.getUrl(`https://api.coinmarketcap.com/v1/ticker/?limit=0&convert=${this.currency}`);
    } catch(err) {
      console.error(`[CoinMarketCap] => ${err.message}`);
    }
  }

  onInit() {
    this.updateRates();
    setInterval(this.updateRates, this.interval);
  }
};
