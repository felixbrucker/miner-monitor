const util = require('../util');

module.exports = {
  poolStats: async (address, rates) => {
    const poolData = await util.getUrl(`https://api.nicehash.com/api?method=stats.provider.ex&addr=${address}`);
    if (poolData.result.error) {
      throw new Error(poolData.result.error);
    }
    let unpaidBalance = 0;
    let profitability = 0;
    const current = poolData.result.current;
    const payments = poolData.result.payments;
    for (let algo of current) {
      if (algo.data['1'] !== '0') {
        unpaidBalance += parseFloat(algo.data['1']);
        if (algo.data['0'].a !== undefined) {
          profitability += parseFloat(algo.data['0'].a) * parseFloat(algo.profitability);
          let workers = await util.getUrl(`https://api.nicehash.com/api?method=stats.provider.workers&addr=${address}&algo=${algo.algo}`);
          workers = workers.result.workers;
          workers.sort((a, b) => {
            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return 1;
            return 0;
          });
          workers.filter((worker) => worker[0] !== '' && worker[1] !== {});
          algo.worker = workers;
        }
      }
    }
    const result = {
      sum: {
        profitability: profitability,
        unpaidBalance: unpaidBalance,
      },
      current: current,
      payments: payments,
      address: address,
    };
    const rate = util.getRateForTicker(rates, 'BTC');
    if (rate) {
      result.sum.profitabilityFiat = parseFloat(rate['price_eur']) * result.sum.profitability;
      result.sum.unpaidBalanceFiat = parseFloat(rate['price_eur']) * result.sum.unpaidBalance;
    }
    return result;
  },
  balance: async (userId, apiKey, rates) => {
    const balanceData = await util.getUrl(`https://api.nicehash.com/api?method=balance&id=${userId}&key=${apiKey}`);
    const result = {
      balance: balanceData.result['balance_confirmed'],
    };
    const rate = util.getRateForTicker(rates, 'BTC');
    if (rate) {
      result.balanceFiat = parseFloat(rate['price_eur']) * result.balance;
    }
    return result;
  }
};