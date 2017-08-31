const axios = require('axios');

module.exports = async (address, apiKey, userId) => {
  const poolData = await axios.get(`https://miningpoolhub.com/index.php?page=api&action=getminingandprofitsstatistics`);
  const coinArr = poolData.data.return;
  const statsData = [];
  for (let coin of coinArr) {
    let dashboardData = await axios.get(`https://${coin.coin_name}.miningpoolhub.com/index.php?page=api&action=getdashboarddata&api_key=${apiKey}&id=${userId}`);
    dashboardData = dashboardData.data.getdashboarddata.data;
    const coinStats = {
      name: coin.coin_name.charAt(0).toUpperCase() + coin.coin_name.slice(1),
      profitability: coin.profit / 1000000.0, //make gh/s->kh/s for easier calculation
      balance: dashboardData.balance,
      balance_ae: dashboardData.balance_for_auto_exchange,
      onExchange: dashboardData.balance_on_exchange,
      hashrate: dashboardData.raw.personal.hashrate, //kh/s
      symbol: dashboardData.pool.info.currency
    };
    const workerData = await axios.get(`https://${coin.coin_name}.miningpoolhub.com/index.php?page=api&action=getuserworkers&api_key=${apiKey}&id=${userId}`);
    if (Array.isArray(workerData.data.getuserworkers.data)) {
      coinStats.workers = workerData.data.getuserworkers.data
        .filter((worker) => worker.hashrate !== 0)
        .map((worker) => {
          const arr = worker.username.split(".");
          worker.username = arr[(arr.length === 1 ? 0 : 1)];
          return worker;
        });
      statsData.push(coinStats);
    }
  }
  return statsData;
};
