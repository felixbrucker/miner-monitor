const superagent = require('superagent');

class CoinGecko {
  constructor() {
    this.interval = 20 * 60 * 1000;
    this.currency = 'EUR';
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.rates = [];

    this.running = false;
    this.init();
  }

  getRates(symbol) {
    return this.rates.filter(rate => rate.symbol === symbol.toLowerCase());
  }

  async updateRates() {
    if (this.running) {
      return;
    }
    this.running = true;
    let page = 1; // what the hell coingecko? page 0 and 1 are the same
    const limit = 100;
    try {
      let allRates = [];
      let rates = [];
      do {
        rates = await this.doApiCall('coins/markets', {vs_currency: this.currency.toLowerCase(), per_page: limit, page});
        allRates = allRates.concat(rates);
        page += 1;
      } while (rates.length === limit);
      this.rates = allRates;
    } catch (err) {
      console.error(`[CoinGecko] => ${err.message}`);
    }
    this.running = false;
  }

  async init() {
    await this.updateRates();
    setInterval(this.updateRates.bind(this), this.interval);
  }

  async doApiCall(endpoint, params = {}) {
    const res = await superagent.get(`${this.baseUrl}/${endpoint}`).query(params);

    return res.body;
  }
}

module.exports = new CoinGecko();
