const { HDPoolAccountApi } = require('hdpool-api');
const moment = require('moment');
const bytes = require('bytes');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

const baseUrl = 'wss://hdpool.com';

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
    this.client = new HDPoolAccountApi(this.dashboard.user_id, this.dashboard.api_key);
    await this.client.init();

    super.onInit();
  }

  async updateStats() {
    const userInfo = await this.client.getUserInfo();
    const generalStats = await this.client.getGeneralStats();
    const miners = await this.client.getMiners();
    const expectedEarningsHistory = await this.client.getExpectedEarningsHistory();
    const earningsHistory = await this.client.getEarningsHistory();

    if (!this.stats.lastPayedTs) {
      this.stats.lastPayedTs = userInfo.wallet.update_ts;
    }
    this.stats.balance = userInfo.wallet.balance / Math.pow(10, 8);
    this.stats.incomeLastDay = generalStats.last24_income / Math.pow(10, 8);
    this.stats.totalIncome = generalStats.total_income / Math.pow(10, 8);
    this.stats.onlineCapacityString = bytes(bytes(`${generalStats.online_capacity}GB`));
    this.stats.miners = miners.map(miner => ({
      name: miner.name,
      capacityString: bytes(bytes(`${miner.capacity}GB`)),
      online: moment().diff(miner.ts * 1000, 'minutes') < 5,
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

    if (expectedEarningsHistory.length > 0) {
      const roundStart = moment(this.stats.lastPayedTs).utcOffset(8).startOf('day').utcOffset(-8);
      this.stats.roundStart = roundStart.toISOString();
      const roundEnd = roundStart.clone().add(1, 'day');
      if (roundEnd.isAfter(moment())) {
        this.stats.roundStart = roundEnd.toISOString();
        this.stats.expectedProfitLastRound = null;
        this.stats.expectedProfit = expectedEarningsHistory
          .filter(round => round.create_ts > roundStart.toISOString())
          .filter(round => round.create_ts < roundEnd.toISOString())
          .reduce((acc, curr) => acc + (curr.curamt / Math.pow(10, 8)), 0);
      } else {
        this.stats.roundStart = roundStart.toISOString();
        this.stats.expectedProfitLastRound = expectedEarningsHistory
          .filter(round => round.create_ts > roundStart.toISOString())
          .filter(round => round.create_ts < roundEnd.toISOString())
          .reduce((acc, curr) => acc + (curr.curamt / Math.pow(10, 8)), 0);
        this.stats.expectedProfit = expectedEarningsHistory
          .filter(round => round.create_ts > roundEnd.toISOString())
          .reduce((acc, curr) => acc + (curr.curamt / Math.pow(10, 8)), 0);
      }
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
