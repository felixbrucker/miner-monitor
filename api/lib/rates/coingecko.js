const superagent = require('superagent');

const util = require('../util');

class CoinGecko {
  constructor() {
    this.interval = 60 * 60 * 1000;
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
    if (symbol.toLowerCase() === 'burst') {
      symbol = 'signa';
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
        await util.sleep(30);
      } catch (err) {
        console.error(`[CoinGecko] => ${err.message}`);
        await util.sleep(60);
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
      response: 60 * 1000, // Wait 1 min for the server to start sending,
      deadline: 90 * 1000, // but allow 1:30 min for the request to finish loading.
    });

    return res.body;
  }
}

module.exports = new CoinGecko();
