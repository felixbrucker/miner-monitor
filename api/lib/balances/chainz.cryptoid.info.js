const util = require('../util');

module.exports = async (address, ticker, apiKey, rates) => {
  const balance = await util.getUrl(`https://chainz.cryptoid.info/${ticker}/api.dws?q=getbalance&a=${address}${apiKey ? '&key=' + apiKey : ''}`);
  const result = {
    balance,
  };
  const rate = util.getRateForTicker(rates, ticker.toUpperCase());
  if (rate) {
    result.balanceFiat = parseFloat(rate['price_eur']) * result.balance;
  }
  return result;
};