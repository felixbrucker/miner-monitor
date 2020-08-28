const io = require('socket.io-client');
const moment = require('moment');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class FoxyPoolV2 extends Dashboard {
  constructor(options = {}) {
    super(options);
    this.stats.coin = this.getCoin(this.dashboard.ticker);
  }

  getCoin(poolIdentifier) {
    switch (poolIdentifier) {
      case 'burst-testnet':
      case 'burst': return 'BURST';
      case 'bhd':
      case 'bhd-testnet':
      case 'bhd-eco': return 'BHD';
      case 'lhd': return 'LHD';
      case 'xhd': return 'XHD';
      case 'hdd': return 'HDD';
    }
  }

  async onInit() {
    const url = 'https://api-v2.foxypool.io:2096/web-ui';
    this.client = io(url, {
      rejectUnauthorized : false,
      transports: ['websocket'],
    });

    this.client.on('connect', this.onWebSocketIoConnected.bind(this));
    this.client.on('stats/pool', (_, poolStats) => this.onNewPoolStats(poolStats));
    this.client.on('stats/round', (_, roundStats) => this.onNewRoundStats(roundStats));
    this.client.on('stats/live', (_, liveStats) => this.onNewLiveStats(liveStats));

    super.onInit();
  }

  async onWebSocketIoConnected() {
    await new Promise(resolve => this.client.emit('subscribe', [this.dashboard.ticker], resolve));
    this.client.emit('stats/init', this.dashboard.ticker, ([poolConfig, poolStats, roundStats, liveStats]) => {
      this.onNewPoolConfig(poolConfig);
      this.onNewPoolStats(poolStats);
      this.onNewRoundStats(roundStats);
      this.onNewLiveStats(liveStats);
    });
  }

  onNewPoolConfig(poolConfig) {
    this.poolConfig = poolConfig;
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

  onNewLiveStats(liveStats) {
    this.liveStats = liveStats;
  }

  getAccountState(account) {
    const lastSubmitHeight = account.lastSubmissionHeight;
    if (!lastSubmitHeight) {
      return account.pledgeShare > 0 ? 3 : 0;
    }
    if (!this.roundStats) {
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
