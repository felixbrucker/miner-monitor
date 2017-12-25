const axios = require('axios');

async function getUrl(url) {
  const result = await axios.get(url);
  return result.data;
}

function getRateForTicker(rates, ticker) {
  return rates.find(rate => rate.symbol === ticker);
}

function getFiatForRate(rate, currency) {
  return rate[`price_${currency.toLowerCase()}`];
}

function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

module.exports = {
  getUrl,
  getRateForTicker,
  getFiatForRate,
  sleep,
};