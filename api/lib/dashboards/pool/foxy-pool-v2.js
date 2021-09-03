const axios = require('axios');
const moment = require('moment');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class FoxyPoolV2 extends Dashboard {
  constructor(options = {}) {
    super(options);
    this.poolIdentifier = this.dashboard.ticker;
    this.stats.coin = this.getCoin(this.poolIdentifier);
  }

  getCoin(poolIdentifier) {
    switch (poolIdentifier) {
      case 'signa': return 'SIGNA';
      case 'bhd': return 'BHD';
      default: return poolIdentifier.toUpperCase();
    }
  }

  async onInit() {
    super.onInit();
    this.poolIdentifier = this.dashboard.ticker;

    this.client = axios.create({
      baseURL: `https://api.foxypool.io/api/stats`,
    });
    await this.initHttpStats();
    setInterval(this.updatePoolStats.bind(this), 61 * 1000);
    setInterval(this.updateRoundStats.bind(this), 61 * 1000);
  }

  async initHttpStats() {
    await Promise.all([
      this.updatePoolStats(),
      this.updateRoundStats(),
    ]);
  }

  async updatePoolStats() {
    this.onNewPoolStats(await this.getPoolStats());
  }

  async updateRoundStats() {
    this.onNewRoundStats(await this.getRoundStats());
  }

  async getPoolStats() {
    const { data } = await this.client.get(`${this.poolIdentifier}/pool`);

    return data;
  }

  async getRoundStats() {
    const { data } = await this.client.get(`${this.poolIdentifier}/round`);

    return data;
  }

  onNewPoolStats(poolStats) {
    const miner = poolStats.accounts.find(account => this.dashboard.address === account.payoutAddress);
    this.stats.miner = miner ? {
      payoutAddress: miner.payoutAddress,
      reportedCapacity: miner.reportedCapacity,
      pending: parseFloat(miner.pending),
      historicalShare: miner.ecShare,
      pledge: parseFloat(miner.pledge),
      historicalPledgeShare: miner.pledgeShare,
      deadlineCount: miner.deadlines,
      ec: miner.ec,
      online: this.getAccountState(miner),
    } : {
      payoutAddress: this.dashboard.address,
      reportedCapacity: 0,
      pending: 0,
      historicalShare: 0,
      pledge: 0,
      historicalPledgeShare: 0,
      deadlineCount: 'N/A',
      ec: 0,
    };

    const lastPayout = poolStats.payouts.find(payout => payout.transactions.some(transaction => Object.keys(transaction.payoutAmounts).some(currentPayoutAddress => currentPayoutAddress === this.dashboard.address)));
    if (!lastPayout) {
      this.stats.lastPayout = null;
    } else {
      const transaction = lastPayout.transactions.find(transaction => Object.keys(transaction.payoutAmounts).some(currentPayoutAddress => currentPayoutAddress === this.dashboard.address));
      this.stats.lastPayout = {
        date: moment(lastPayout.createdAt).format('YYYY-MM-DD'),
        amount: transaction.payoutAmounts[this.dashboard.address],
      };
    }

    const rates = coinGecko.getRates(this.dashboard.ticker);
    const rate = rates.length > 0 ? rates[0] : null;
    if (!rate) {
      return;
    }
    this.stats.miner.pendingFiat = parseFloat(rate.current_price) * this.stats.miner.pending;
    this.stats.miner.pledgeFiat = parseFloat(rate.current_price) * this.stats.miner.pledge;
    if (this.stats.lastPayout) {
      this.stats.lastPayout.amountFiat = parseFloat(rate.current_price) * parseFloat(this.stats.lastPayout.amount);
    }
  }

  onNewRoundStats(roundStats) {
    this.roundStats = roundStats;
  }

  getAccountState(account) {
    const lastSubmitHeight = account.lastSubmissionHeight;
    if (!lastSubmitHeight) {
      return account.pledgeShare > 0 ? 3 : 0;
    }
    if (!this.roundStats || !this.roundStats.round) {
      return 1;
    }
    if (this.roundStats.round.height - lastSubmitHeight > 6) {
      return 0;
    }
    if (this.roundStats.round.height - lastSubmitHeight > 3) {
      return 2;
    }

    return 1;
  }
};
