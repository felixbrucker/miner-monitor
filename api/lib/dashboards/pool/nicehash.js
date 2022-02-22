const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');
const NicehashApi = require('../../nicehash-api');

module.exports = class Nicehash extends Dashboard {
  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
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
    const miningStats = await this.nicehashApi.getMiningStats();
    const btcRates = coinGecko.getRates('BTC');
    const btcRate = btcRates.length > 0 ? btcRates[0] : null;
    if (btcRate) {
      miningStats.totalProfitabilityFiat = parseFloat(btcRate.current_price) * miningStats.totalProfitability;
      miningStats.unpaidAmountFiat = parseFloat(btcRate.current_price) * parseFloat(miningStats.unpaidAmount);
    }

    const accountDetails = await this.nicehashApi.getAccount();
    const accountTotalCurrencyRates = coinGecko.getRates(accountDetails.total.currency);
    const accountTotalCurrencyRate = accountTotalCurrencyRates.length > 0 ? accountTotalCurrencyRates[0] : null;
    if (accountTotalCurrencyRate) {
      accountDetails.total.availableFiat = parseFloat(accountTotalCurrencyRate.current_price) * parseFloat(accountDetails.total.available);
      accountDetails.total.pendingFiat = parseFloat(accountTotalCurrencyRate.current_price) * parseFloat(accountDetails.total.pending);
      accountDetails.total.totalBalanceFiat = parseFloat(accountTotalCurrencyRate.current_price) * parseFloat(accountDetails.total.totalBalance);
    }
    const positiveBalances = accountDetails.currencies.filter(currency => parseFloat(currency.totalBalance) > 0);
    positiveBalances.forEach(balance => {
      const rates = coinGecko.getRates(balance.currency);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        balance.availableFiat = parseFloat(rate.current_price) * parseFloat(balance.available);
        balance.pendingFiat = parseFloat(rate.current_price) * parseFloat(balance.pending);
        balance.totalBalanceFiat = parseFloat(rate.current_price) * parseFloat(balance.totalBalance);
      }
    });

    this.stats = {
      miningStats,
      totalBalance: accountDetails.total,
      positiveBalances,
    };
  }
};
