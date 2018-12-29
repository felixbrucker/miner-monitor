const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class GenericWallet extends Dashboard {

  static getDefaults() {
    return {
      interval: 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(GenericWallet.getDefaults(), options);
    super(options);
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

    const bestBockHashData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getbestblockhash',
      params: [],
    });
    const latestBlockData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getblock',
      params: [
        bestBockHashData.result,
      ],
    });
    result.lastBlockReceived = latestBlockData.result.time;

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
    if (result.unconfirmed && walletData.result.immature_balance) {
      result.unconfirmed += walletData.result.immature_balance;
    } else if (walletData.result.immature_balance){
      result.unconfirmed = walletData.result.immature_balance;
    }
    result.total = result.balance;
    if (result.unconfirmed) {
      result.total += result.unconfirmed;
    }

    const blockchainData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getblockchaininfo',
      params: [],
    });
    result.syncProgress = blockchainData.result.verificationprogress;

    const latestBlockData = await util.postUrl(this.dashboard.baseUrl, {
      jsonrpc: '1.0',
      id: 0,
      method: 'getblock',
      params: [
        blockchainData.result.bestblockhash,
      ],
    });
    result.lastBlockReceived = latestBlockData.result.time;

    return result;
  }

  async updateStats() {
    const getDataForWallet = this.isOldWallet ? this.getDataForOldWallet.bind(this) : this.getDataForNewWallet.bind(this);
    try {
      const result = await getDataForWallet();

      const rates = coinGecko.getRates(this.dashboard.ticker);
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.balanceFiat = parseFloat(rate.current_price) * result.balance;
        result.totalFiat = parseFloat(rate.current_price) * result.total;
        if (result.unconfirmed !== undefined) {
          result.unconfirmedFiat = parseFloat(rate.current_price) * result.unconfirmed;
        }
        if (result.staked !== undefined) {
          result.stakedFiat = parseFloat(rate.current_price) * result.staked;
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
