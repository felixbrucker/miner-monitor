const https = require('https');
const axios = require('axios');

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function getUrl(url) {
  const result = await axios.get(url, {httpsAgent: agent});
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

function parseHashrate(hashrateString) {
  const hashrateArr = hashrateString.split(' ');
  if (hashrateArr.length !== 2) {
    throw new Error(`can't parse hashrate string: ${hashrateString}`);
  }
  let hashrate = parseFloat(hashrateArr[0]);
  switch(hashrateArr[1]) {
    case 'PH':
    case 'PH/s':
      hashrate *= 1000;
    case 'TH':
    case 'TH/s':
      hashrate *= 1000;
    case 'GH':
    case 'GH/s':
      hashrate *= 1000;
    case 'MH':
    case 'MH/s':
      hashrate *= 1000;
    case 'KH':
    case 'KH/s':
      hashrate *= 1000;
    case 'H':
    case 'H/s':
      break;
  }

  return hashrate;
}

module.exports = {
  getUrl,
  getRateForTicker,
  getFiatForRate,
  sleep,
  parseHashrate,
};