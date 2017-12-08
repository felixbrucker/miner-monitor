const util = require('../util');

module.exports = async (address, baseUrl, apiKey, userId, hrModifier, rates) => {
  let dashboardData = await util.getUrl(`${baseUrl}/index.php?page=api&action=getdashboarddata&api_key=${apiKey}&id=${userId}`);
  dashboardData = dashboardData.getdashboarddata.data;
  let workerData = await util.getUrl(`${baseUrl}/index.php?page=api&action=getuserworkers&api_key=${apiKey}&id=${userId}`);
  workerData = workerData.getuserworkers.data;
  let balanceData = await util.getUrl(`${baseUrl}/index.php?page=api&action=getuserbalance&api_key=${apiKey}&id=${userId}`);
  balanceData = balanceData.getuserbalance.data;
  workerData = workerData
    .sort((a, b) => {
      if (a.username < b.username) return -1;
      if (a.username > b.username) return 1;
      return 0;
    })
    .filter((worker) => worker.hashrate !== 0)
    .map((worker) => {
      const arr = worker.username.split(".");
      worker.username = arr[(arr.length === 1 ? 0 : 1)];
      worker.hashrate = worker.hashrate / hrModifier;
    });

  const result = {
    baseUrl,
    hashrate: dashboardData.raw.personal.hashrate / hrModifier,
    symbol: dashboardData.pool.info.currency,
    estimated: dashboardData.personal.estimates.payout,
    workers: workerData,
    confirmed: balanceData.confirmed,
    unconfirmed: balanceData.unconfirmed,
  };

  const rate = util.getRateForTicker(rates, result.symbol.toUpperCase());
  if (rate) {
    result.confirmedFiat = parseFloat(rate['price_eur']) * result.confirmed;
    result.unconfirmedFiat = parseFloat(rate['price_eur']) * result.unconfirmed;
    result.estimatedFiat = parseFloat(rate['price_eur']) * result.estimated;
  }

  return result;
};
