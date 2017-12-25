const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class Nicehash extends Dashboard {

  static getDefaults() {
    return {
      interval: 2 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(Nicehash.getDefaults(), options);
    super(options, coinmarketcap);
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
        if (algo.data['1'] !== '0') {
          unpaidBalance += parseFloat(algo.data['1']);
          if (algo.data['0'].a !== undefined) {
            profitability += parseFloat(algo.data['0'].a) * parseFloat(algo.profitability);
            let workers = await util.getUrl(`https://api.nicehash.com/api?method=stats.provider.workers&addr=${this.dashboard.address}&algo=${algo.algo}`);
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
        address: this.dashboard.address,
      };
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), 'BTC');
      if (rate) {
        result.sum.profitabilityFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.sum.profitability;
        result.sum.unpaidBalanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.sum.unpaidBalance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Nicehash-API] => ${err.message}`);
    }
  }
};
