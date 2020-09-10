const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');
const NicehashApi = require('../../nicehash-api');

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

  onInit() {
    this.nicehashApi = new NicehashApi({
      apiKey: this.dashboard.api_key,
      apiSecret: this.dashboard.address,
      organizationId: this.dashboard.user_id,
    });
    super.onInit();
  }

  async updateStats() {
    const accountDetails = await this.nicehashApi.getAccount();
    const miningStats = await this.nicehashApi.getMiningStats();
    const miningPayouts = await this.nicehashApi.getMiningPayouts();

    const rates = coinGecko.getRates('BTC');
    const rate = rates.length > 0 ? rates[0] : null;
    if (rate) {
      miningStats.totalProfitabilityFiat = parseFloat(rate.current_price) * miningStats.totalProfitability;
      accountDetails.total.pendingFiat = parseFloat(rate.current_price) * accountDetails.total.pending;
    }

    this.stats = {
      balances: accountDetails.total,
      miningStats,
      miningPayouts,
    };
  }
};
