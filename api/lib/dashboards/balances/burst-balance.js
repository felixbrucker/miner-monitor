const https = require('https');
const axios = require('axios');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class BurstBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(BurstBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      const balanceData = await axios.get(`https://wallet1.burst-team.us:2083/burst?requestType=getAccount&account=${this.dashboard.address}`, {httpsAgent: agent});
      const result = {
        balance: balanceData.data.effectiveBalanceNXT / 100000000,
      };

      const rates = coinGecko.getRates('BURST');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Burst-Balance-API] => ${err.message}`);
    }
  }
};
