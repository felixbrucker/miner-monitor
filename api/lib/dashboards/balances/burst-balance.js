const https = require('https');
const axios = require('axios');
const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class BurstBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(BurstBalance.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      const balanceData = await axios.get(`https://wallet.burst.cryptoguru.org:8125/burst?requestType=getAccount&account=${this.dashboard.address}`, {httpsAgent: agent});
      const result = {
        balance: balanceData.data.effectiveBalanceNXT / 100000000,
      };
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), 'BURST');
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Burst-Balance-API] => ${err.message}`);
    }
  }
};
