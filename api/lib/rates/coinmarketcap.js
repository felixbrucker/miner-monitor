const util = require('../util');

module.exports = class Coinmarketcap {

  static getDefaults() {
    return {
      interval: 15 * 60 * 1000,
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

    this.running = false;
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
    if (this.running) {
      return;
    }
    this.running = true;
    const limit = 100;
    let start = 0;
    let exit = false;
    let allRates = [];
    do {
      try {
        const rates = await util.getUrl(`https://api.coinmarketcap.com/v1/ticker/?limit=${limit}&start=${start}&convert=${this.currency}`);
        if (!rates.length) {
          throw new Error(`no array returned: ${JSON.stringify(rates)}`);
        }
        allRates = allRates.concat(rates);
        start += limit;

        if (rates.length !== limit) {
          exit = true;
        }
      } catch (err) {
        if (err.response.data && err.response.data.error === 'id not found') {
          exit = true;
          continue;
        }
        console.error(`[CoinMarketCap] => ${err.message}`);
        await util.sleep(10);
      }
    } while (!exit);
    this.rates = allRates;
    this.running = false;
  }

  onInit() {
    this.updateRates();
    setInterval(this.updateRates.bind(this), this.interval);
  }
};
