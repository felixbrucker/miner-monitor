const { HDPoolAccountApi } = require('hdpool-api');
const moment = require('moment');
const bytes = require('bytes');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class HDPool extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(HDPool.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      symbol: 'BHD',
    });
  }

  async onInit() {
    this.isEco = this.dashboard.address === 'eco';
    this.client = new HDPoolAccountApi(this.dashboard.user_id, this.dashboard.api_key);
    await this.client.init();

    if (this.isEco) {
      this.ecoClient = new HDPoolAccountApi(this.dashboard.user_id, this.dashboard.api_key, true);
      await this.ecoClient.init();
    }

    super.onInit();
  }

  async updateStats() {
    const client = this.ecoClient ? this.ecoClient : this.client;
    const userInfo = await this.client.getUserInfo();
    const generalStats = await client.getGeneralStats();
    const miners = await client.getMiners();
    const expectedEarningsHistory = await client.getExpectedEarningsHistory();
    const earningsHistory = await client.getEarningsHistory();

    this.stats.currentRoundEndDate = HDPoolAccountApi.getCurrentRoundEndDate();
    this.stats.nextBalanceUpdateDate = HDPoolAccountApi.getNextBalanceUpdateDate();

    if (!this.stats.lastPayedTs) {
      this.stats.lastPayedTs = userInfo.wallet.update_ts;
    }
    this.stats.balance = userInfo.wallet.balance / Math.pow(10, 8);
    this.stats.incomeLastDay = generalStats.last24_income / Math.pow(10, 8);
    this.stats.totalIncome = generalStats.total_income / Math.pow(10, 8);
    this.stats.onlineCapacity = bytes(`${generalStats.online_capacity}GB`);
    this.stats.onlineCapacityString = bytes(this.stats.onlineCapacity);
    this.stats.miners = miners.map(miner => ({
      name: miner.name,
      capacityString: bytes(bytes(`${miner.capacity}GB`)),
      online: moment().diff(miner.ts * 1000, 'minutes') < 5,
      submitting: miner.is_submit === 1,
      lastSeen: new Date(miner.ts * 1000),
    })).sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
    if (earningsHistory.length > 0) {
      this.stats.lastPayedTs = earningsHistory[0].create_ts;
    }

    const roundStart = moment(this.stats.currentRoundEndDate).subtract(1, 'day');
    const roundEnd = moment(this.stats.currentRoundEndDate);
    const lastRoundStart = roundStart.clone().subtract(1, 'day');
    if (expectedEarningsHistory.length > 0) {
      this.stats.expectedProfit = expectedEarningsHistory
        .filter(round => round.create_ts > roundStart.toISOString())
        .filter(round => round.create_ts < roundEnd.toISOString())
        .reduce((acc, curr) => acc + (curr.curamt / Math.pow(10, 8)), 0);
      this.stats.expectedProfitLastRound = expectedEarningsHistory
        .filter(round => round.create_ts > lastRoundStart.toISOString())
        .filter(round => round.create_ts < roundStart.toISOString())
        .reduce((acc, curr) => acc + (curr.curamt / Math.pow(10, 8)), 0);
    }

    const rate = coinGecko.getRates('BHD').find(rate => rate.id === 'bitcoin-hd');
    if (!rate) {
      return;
    }
    this.stats.balanceFiat = parseFloat(rate.current_price) * this.stats.balance;
    this.stats.incomeLastDayFiat = parseFloat(rate.current_price) * this.stats.incomeLastDay;
    this.stats.totalIncomeFiat = parseFloat(rate.current_price) * this.stats.totalIncome;
    this.stats.expectedProfitFiat = parseFloat(rate.current_price) * this.stats.expectedProfit;
    if (this.stats.expectedProfitLastRound) {
      this.stats.expectedProfitLastRoundFiat = parseFloat(rate.current_price) * this.stats.expectedProfitLastRound;
    } else {
      this.stats.expectedProfitLastRoundFiat = null;
    }
  }

  cleanup() {
    this.client.destroy();
    super.cleanup();
  }
};
