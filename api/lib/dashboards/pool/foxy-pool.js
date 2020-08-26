const io = require('socket.io-client');
const moment = require('moment');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class FoxyPool extends Dashboard {
  constructor(options = {}) {
    super(options);
    this.stats.coin = this.dashboard.ticker.toUpperCase();
  }

  async onInit() {
    const url = `https://${this.dashboard.ticker.toLowerCase()}.foxypool.cf/web-ui`;
    this.client = io(url, {
      rejectUnauthorized : false,
      transports: ['websocket'],
    });

    this.client.on('connect', this.onWebSocketIoConnected.bind(this));
    this.client.on('stats/pool', this.onNewPoolStats.bind(this));
    this.client.on('stats/current-round', this.onNewRoundStats.bind(this));
    this.client.on('stats/live', this.onNewLiveStats.bind(this));

    super.onInit();
  }

  onWebSocketIoConnected() {
    this.client.emit('stats/init', ([poolConfig, poolStats, roundStats, liveStats]) => {
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
    const miner = poolStats.miners.find(miner => this.dashboard.address === miner.payoutAddress);
    this.stats.miner = miner ? miner : {
      payoutAddress: this.dashboard.address,
      machines: [],
      reportedCapacity: 0,
      pending: 0,
      historicalShare: 0,
      pledge: 0,
      historicalPledgeShare: 0,
      deadlineCount: 'N/A',
      ec: 0,
    };

    const lastPayout = poolStats.payouts.find(payout => Object.keys(payout.addressAmountPairs).some(currentPayoutAddress => currentPayoutAddress === this.dashboard.address));
    if (!lastPayout) {
      this.stats.lastPayout = null;
    } else {
      this.stats.lastPayout = {
        date: moment(lastPayout.createdAt).format('YYYY-MM-DD'),
        amount: lastPayout.addressAmountPairs[this.dashboard.address],
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
};
