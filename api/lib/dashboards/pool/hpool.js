const HpoolApi = require('hpool-api');
const moment = require('moment');
const bytes = require('bytes');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

module.exports = class HPool extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(HPool.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      symbol: 'BHD',
    });
  }

  async onInit() {
    this.client = new HpoolApi(this.dashboard.api_key, this.dashboard.user_id, this.dashboard.address);

    super.onInit();
  }

  async updateStats() {
    const pendingBalance = await this.client.getPendingBalance();
    const mortgageInfo = await this.client.getMortgageInfo();
    const miners = await this.client.getMiner();
    const earningsHistory = await this.client.getEarningsHistory();

    this.stats.lastPayedTs = earningsHistory.length > 0 ? earningsHistory[0].created : moment().toISOString();
    this.stats.unconfirmed = pendingBalance;
    this.stats.balance = mortgageInfo.total_amount;
    this.stats.incomeLastDay = earningsHistory.length > 0 ? earningsHistory[0].amount : 0;
    this.stats.miners = miners.map(miner => ({
      name: miner.miner_name,
      capacityString: bytes(bytes(`${miner.capacity}GB`)),
      capacity: bytes(`${miner.capacity}GB`),
      online: moment().diff(moment(miner.updated), 'minutes') < 5,
      lastSeen: moment(miner.updated).toDate(),
    })).sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
    this.stats.onlineCapacity = this.stats.miners.reduce((capacity, miner) => capacity + miner.capacity, 0);
    this.stats.onlineCapacityString = bytes(this.stats.onlineCapacity);

    const rate = coinGecko.getRates('BHD').find(rate => rate.id === 'bitcoin-hd');
    if (!rate) {
      return;
    }
    this.stats.balanceFiat = parseFloat(rate.current_price) * this.stats.balance;
    this.stats.incomeLastDayFiat = parseFloat(rate.current_price) * this.stats.incomeLastDay;
    this.stats.unconfirmedFiat = parseFloat(rate.current_price) * this.stats.unconfirmed;
  }
};
