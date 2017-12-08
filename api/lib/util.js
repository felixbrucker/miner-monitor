const axios = require('axios');

async function getUrl(url) {
  const result = await axios.get(url);
  return result.data;
}

function getRateForTicker(rates, ticker) {
  return rates.find(rate => rate.symbol === ticker);
}

module.exports = {
  getUrl,
  getRateForTicker,
};