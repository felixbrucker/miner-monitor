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
    if (symbol.toLowerCase() === 'eur') {
      return [{ current_price: 1 }];
    }

    return this.rates.filter(rate => rate.symbol === symbol.toLowerCase());
  }

  async updateRates() {
    if (this.running) {
      return;
    }
    this.running = true;
    let page = 1; // what the hell coingecko? page 0 and 1 are the same
    const limit = 250;
    let allRates = [];
    let rates = [];
    do {
      try {
        rates = await this.doApiCall('coins/markets', {vs_currency: this.currency.toLowerCase(), per_page: limit, page, order: 'id_asc'});
        allRates = allRates.concat(rates);
        page += 1;
      } catch (err) {
        console.error(`[CoinGecko] => ${err.message}`);
      }
    } while (rates.length === limit);
    this.rates = allRates;
    this.running = false;
  }

  async init() {
    await this.updateRates();
    setInterval(this.updateRates.bind(this), this.interval);
  }

  async doApiCall(endpoint, params = {}) {
    const res = await superagent.get(`${this.baseUrl}/${endpoint}`).query(params).timeout({
      response: 10 * 1000,  // Wait 10 seconds for the server to start sending,
      deadline: 30 * 1000, // but allow 1 minute for the file to finish loading.
    });

    return res.body;
  }
}

module.exports = new CoinGecko();
