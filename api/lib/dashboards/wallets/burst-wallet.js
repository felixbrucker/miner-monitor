const superagent = require('superagent');
const JSONbig = require('json-bigint');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class BurstWallet extends Dashboard {

  static getDefaults() {
    return {
      interval: 2 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(BurstWallet.getDefaults(), options);
    options.dashboard.ticker = options.dashboard.ticker || 'BURST';
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      ticker: this.dashboard.ticker.toUpperCase(),
    });
  }

  async updateStats() {
    try {
      const balance = await this.getBalance();
      const peerCount = await this.getPeerCount();
      const lastBlockReceived = await this.getLastBlockReceived();

      const result = {
        balance,
        unconfirmed: 0,
        total: balance,
        connections: peerCount,
        lastBlockReceived,
        syncProgress: 1,
      };

      const rates = coinGecko.getRates('BURST');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: BURST-Wallet-API] => ${err.message}`);
    }
  }

  async getLastBlockReceived() {
    const block = await this.doApiCall('getBlock');

    return block.timestamp * 1000;
  }

  async getBalance() {
    const accountInfo = await this.doApiCall('getAccount', {
      account: this.dashboard.address,
    });

    return parseInt(accountInfo.balanceNQT, 10) / Math.pow(10, 8);
  }

  async getPeerCount() {
    const peers = await this.doApiCall('getPeers', {
      active: true,
    });

    return peers.peers.length;
  }

  async doApiCall(requestType, params = {}, method = 'get') {
    const queryParams = Object.assign(params, {requestType});
    const res = await superagent[method](`${this.dashboard.baseUrl}/burst`).query(queryParams);

    return JSONbig.parse(res.text);
  }
};
