const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class Nicehash extends Dashboard {

  static getDefaults() {
    return {
      interval: 2 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(Nicehash.getDefaults(), options);
    super(options);
  }

  async updateStats() {
    try {
      const poolData = await util.getUrl(`https://api.nicehash.com/api?method=stats.provider.ex&addr=${this.dashboard.address}`);
      if (poolData.result.error) {
        throw new Error(poolData.result.error);
      }
      let unpaidBalance = 0;
      let profitability = 0;
      const current = poolData.result.current;
      const payments = poolData.result.payments;
      for (let algo of current) {
        algo.data[1] = parseFloat(algo.data[1]);
        if (algo.data[1] !== 0) {
          unpaidBalance += algo.data[1];
          if (algo.data[0].a !== undefined) {
            profitability += parseFloat(algo.data[0].a) * parseFloat(algo.profitability);
            let workers = await util.getUrl(`https://api.nicehash.com/api?method=stats.provider.workers&addr=${this.dashboard.address}&algo=${algo.algo}`);
            workers = workers.result.workers;
            workers.sort((a, b) => { // sort by worker name
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
        address: this.dashboard.address,
      };
      const rates = coinGecko.getRates('BTC');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.sum.profitabilityFiat = parseFloat(rate.current_price) * result.sum.profitability;
        result.sum.unpaidBalanceFiat = parseFloat(rate.current_price) * result.sum.unpaidBalance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Nicehash-API] => ${err.message}`);
    }
  }
};
