const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class GenericWallet extends Dashboard {

  static getDefaults() {
    return {
      interval: 60 * 1000,
    };
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(GenericWallet.getDefaults(), options);
    super(options, coinmarketcap);
  }

  async getDataForOldWallet() {
    const walletData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getinfo',
      params: [],
    });
    const result = {
      version: walletData.result.version,
      balance: walletData.result.balance,
      unconfirmed: walletData.result.newmint,
      staked: walletData.result.stake,
      connections: walletData.result.connections,
    };
    result.total = result.balance;
    if (result.unconfirmed) {
      result.total += result.unconfirmed;
    }
    if (result.staked) {
      result.total += result.staked;
    }

    return result;
  }

  async getDataForNewWallet() {
    const networkData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getnetworkinfo',
      params: [],
    });
    const result = {
      version: networkData.result.subversion,
      connections: networkData.result.connections,
    };
    const walletData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getwalletinfo',
      params: [],
    });
    result.balance = walletData.result.balance;
    result.unconfirmed = walletData.result.unconfirmed_balance;

    result.total = result.balance;
    if (result.unconfirmed) {
      result.total += result.unconfirmed;
    }

    return result;
  }

  async updateStats() {
    const getDataForWallet = this.isOldWallet ? this.getDataForOldWallet.bind(this) : this.getDataForNewWallet.bind(this);
    try {
      const result = await getDataForWallet();
      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), this.dashboard.ticker);
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
        result.totalFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.total;
        if (result.unconfirmed !== undefined) {
          result.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.unconfirmed;
        }
        if (result.staked !== undefined) {
          result.stakedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.staked;
        }
      }
      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Generic-Wallet-API] => ${err.message}`);
      this.stats = null;
    }
  }

  async determineIfOldWallet() {
    this.isOldWallet = true;
    try {
      const networkData = await util.postUrl(this.dashboard.baseUrl, {
        jsonrpc: '1.0',
        id: 0,
        method: 'getnetworkinfo',
        params: [],
      });

      if (networkData.error === null) {
        this.isOldWallet = false;
      }
    } catch(err) {} // ignore errors here, old wallet does not support the method
  }

  async onInit() {
    await this.determineIfOldWallet();
    super.onInit();
  }

  getStats() {
    return Object.assign(super.getStats(), {
      ticker: this.dashboard.ticker.toUpperCase(),
    });
  }
};
