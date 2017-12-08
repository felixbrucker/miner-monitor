const util = require('../util');

module.exports = async (address, rates) => {
  const balanceData = await util.getUrl(`https://blockchain.info/address/${address}?format=json&limit=0`);
  const result = {
    balance: balanceData['final_balance'] / 100000000,
  };
  const rate = util.getRateForTicker(rates, 'BTC');
  if (rate) {
    result.balanceFiat = parseFloat(rate['price_eur']) * result.balance;
  }
  return result;
};