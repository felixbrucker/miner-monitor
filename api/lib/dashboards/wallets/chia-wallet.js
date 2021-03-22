const { Agent: HttpsAgent } = require('https');
const axios = require('axios');

const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class ChiaWallet extends Dashboard {
  static getDefaults() {
    return {
      interval: 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(ChiaWallet.getDefaults(), options);
    super(options);
  }

  onInit() {
    this.client = axios.create({
      baseURL: this.dashboard.baseUrl,
      httpsAgent: new HttpsAgent({
        rejectUnauthorized: false,
        cert: this.dashboard.api_key.split(':')[0].split('\\n').join('\n'),
        key: this.dashboard.api_key.split(':')[1].split('\\n').join('\n'),
      }),
    });
    this.client.interceptors.response.use((response) => {
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response;
    });
    this.updateStats();
    this.runningInterval = setInterval(this.updateStats.bind(this), this.interval);
  }

  async retrieveStats() {
    const { data: syncData } = await this.client.post('/get_sync_status', {});
    const result = {
      syncProgress: syncData.syncing ? 0 : 1,
      lastBlockReceived: Date.now() / 1e3, // placeholder because unsupported
    };
    const { data: balanceData } = await this.client.post('/get_wallet_balance', { wallet_id: 1 });
    result.balance = balanceData.wallet_balance.spendable_balance / 1e12;
    result.unconfirmed = (balanceData.wallet_balance.unconfirmed_wallet_balance / 1e12) - result.balance;
    result.total = result.balance + result.unconfirmed;

    return result;
  }

  async updateStats() {
    try {
      const result = await this.retrieveStats();

      const rates = coinGecko.getRates('xch');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
        if (result.unconfirmed !== undefined) {
          result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        }
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Chia-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }

  getStats() {
    return Object.assign(super.getStats(), {
      ticker: 'XCH',
    });
  }
};
