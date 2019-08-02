const superagent = require('superagent');
const JSONbig = require('json-bigint');
const BurstWallet = require('./burst-wallet');
const coinGecko = require('../../rates/coingecko');
const Capacity = require('../../capacity');

module.exports = class BoomWallet extends BurstWallet {
  constructor(options = {}) {
    options = Object.assign(BurstWallet.getDefaults(), options);
    options.endpoint = 'boom';
    options.dashboard.ticker = options.dashboard.ticker || 'BOOM';
    super(options);
  }

  async updateStats() {
    try {
      const balance = await this.getBalance();
      const peerCount = await this.getPeerCount();
      const lastBlockReceived = await this.getLastBlockReceived();
      const pledge = await this.getPledge();
      const pledgeCapacity = await this.pledgeCapacity();
      const pledgeAmount = pledgeCapacity * 30;

      const result = {
        balance,
        unconfirmed: 0,
        total: balance,
        connections: peerCount,
        lastBlockReceived,
        pledgeCapacity: Capacity.fromTiB(pledgeCapacity).toString(),
        pledgeAmount,
        pledge,
        syncProgress: 1,
      };

      const rates = coinGecko.getRates('BOOM');
      const rate = rates.find(rate => rate.id === 'boom-coin');
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: BOOM-Wallet-API] => ${err.message}`);
    }
  }

  async getPledge() {
    const accountInfo = await this.doApiCall('getAccount', {
      account: this.dashboard.address,
    });

    return parseInt(accountInfo.pledgesIn, 10) / Math.pow(10, 8);
  }

  async pledgeCapacity() {
    const res = await this.doApiCall('getCapacity', {
      account: this.dashboard.address,
    });

    return parseFloat(res.capacity);
  }

  async doApiCall(requestType, params = {}, method = 'get') {
    const queryParams = Object.assign(params, {requestType});
    const res = await superagent[method](`${this.dashboard.baseUrl}/boom`).query(queryParams);

    return JSONbig.parse(res.text);
  }
};
