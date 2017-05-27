const axios = require('axios');

module.exports = async (address, exchangeRates) => {
  const poolData = await axios.get(`https://api.nicehash.com/api?method=stats.provider.ex&addr=${address}`);
  if (poolData.data.result.error) {
    throw new Error(poolData.data.result.error);
  }
  let unpaidBalance = 0;
  let profitability = 0;
  const current = poolData.data.result.current;
  const payments = poolData.data.result.payments;
  for (let algo of current) {
    if (algo.data['1'] !== '0') {
      unpaidBalance += parseFloat(algo.data['1']);
      if (algo.data['0'].a !== undefined) {
        profitability += parseFloat(algo.data['0'].a) * parseFloat(algo.profitability);
        let workers = await axios.get(`https://api.nicehash.com/api?method=stats.provider.workers&addr=${address}&algo=${algo.algo}`);
        workers = workers.data.result.workers;
        workers.sort((a, b) => {
          if (a[0] < b[0]) return -1;
          if (a[0] > b[0]) return 1;
          return 0;
        });
        workers.filter((worker) => {
          if (worker[0] !== '' && worker[1] !== {}) {
            return true;
          }
          return false;
        });
        algo.worker = workers;
      }
    }
  }
  return {
    sum: {
      profitability: profitability,
      unpaidBalance: unpaidBalance,
      profitabilityEur: profitability * exchangeRates.eurPerBTC,
      unpaidBalanceEur: unpaidBalance * exchangeRates.eurPerBTC,
    },
    current: current,
    payments: payments,
    address: address,
  };
};