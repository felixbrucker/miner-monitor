const util = require('../util');

module.exports = async (address, rates) => {
  const balanceData = await util.getUrl(`https://xchain.io/api/balances/${address}`);
  balanceData.data.forEach((asset) => {
    asset.balance = parseFloat(asset.quantity);
    delete asset.quantity;
    const rate = util.getRateForTicker(rates, asset.asset.toUpperCase());
    if (rate) {
      asset.balanceFiat = parseFloat(rate['price_eur']) * asset.balance;
    }
  });
  return balanceData.data;
};