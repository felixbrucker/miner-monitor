const axios = require('axios');

module.exports = async (address, baseUrl, apiKey, userId, hrModifier) => {
  let dashboardData = await axios.get(`${baseUrl}/index.php?page=api&action=getdashboarddata&api_key=${apiKey}&id=${userId}`);
  dashboardData = dashboardData.data.getdashboarddata.data;
  let workerData = await axios.get(`${baseUrl}/index.php?page=api&action=getuserworkers&api_key=${apiKey}&id=${userId}`);
  workerData = workerData.data.getuserworkers.data;
  let balanceData = await axios.get(`${baseUrl}/index.php?page=api&action=getuserbalance&api_key=${apiKey}&id=${userId}`);
  balanceData = balanceData.data.getuserbalance.data;
  workerData = workerData
    .sort(function (a, b) {
      if (a.username < b.username) return -1;
      if (a.username > b.username) return 1;
      return 0;
    })
    .filter((worker) => {
      if (worker.hashrate !== 0) {
        return true;
      }
      return false;
    })
    .map((worker) => {
      const arr = worker.username.split(".");
      worker.username = arr[(arr.length === 1 ? 0 : 1)];
      worker.hashrate = worker.hashrate / hrModifier;
    });

  return {
    baseUrl,
    hashrate: dashboardData.raw.personal.hashrate / hrModifier,
    symbol: dashboardData.pool.info.currency,
    estimated: dashboardData.personal.estimates.payout,
    workers: workerData,
    confirmed: balanceData.confirmed,
    unconfirmed: balanceData.unconfirmed,
  };
};
