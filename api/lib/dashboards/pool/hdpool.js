const ReconnectingWebSocket = require('reconnecting-websocket');
const WebSocket = require('ws');
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
    this.client = new ReconnectingWebSocket(`${baseUrl}/?uid=${this.dashboard.user_id}&key=${this.dashboard.api_key}`, [], {
      WebSocket,
    });
    this.client.addEventListener('message', this.onMessage.bind(this));

    await new Promise(resolve => {
      this.client.addEventListener('open', resolve, {once: true});
    });

    this.sendHeartbeat();
    setInterval(this.sendHeartbeat.bind(this), 5 * 1000);

    super.onInit();
  }

  onMessage(msg) {
    msg = JSON.parse(msg.data);
    let rate = null;
    switch (msg.cmd) {
      case 'online.heartbeat':
        break;
      case 'apid.best_mining_info':
        break;
      case 'logind.get_uinfo':
        this.stats.lastPayedTs = msg.para.wallet.update_ts;
        this.stats.balance = msg.para.wallet.balance / Math.pow(10, 8);
        rate = coinGecko.getRates('BHD').find(rate => rate.id === 'bitcoin-hd');
        if (rate) {
          this.stats.balanceFiat = parseFloat(rate.current_price) * this.stats.balance;
        }
        break;
      case 'apid.get_index_data':
        this.stats.incomeLastDay = msg.para.last24_income / Math.pow(10, 8);
        this.stats.totalIncome = msg.para.total_income / Math.pow(10, 8);
        this.stats.onlineCapacityString = bytes(bytes(`${msg.para.online_capacity}GB`));
        rate = coinGecko.getRates('BHD').find(rate => rate.id === 'bitcoin-hd');
        if (rate) {
          this.stats.incomeLastDayFiat = parseFloat(rate.current_price) * this.stats.incomeLastDay;
          this.stats.totalIncomeFiat = parseFloat(rate.current_price) * this.stats.totalIncome;
        }
        break;
      case 'apid.get_mill_list':
        this.stats.miners = msg.para.data.map(miner => ({
          name: miner.name,
          capacityString: bytes(bytes(`${miner.capacity}GB`)),
          online: miner.is_online === 1,
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
        break;
      case 'apid.get_expected_profit':
        this.stats.expectedProfit = msg.para.data.filter(round => round.create_ts > this.stats.lastPayedTs).reduce((acc, curr) => acc + (curr.curamt / Math.pow(10, 8)), 0);
        rate = coinGecko.getRates('BHD').find(rate => rate.id === 'bitcoin-hd');
        if (rate) {
          this.stats.expectedProfitFiat = parseFloat(rate.current_price) * this.stats.expectedProfit;
        }
        break;
      default:
        console.log(`[${this.dashboard.name} :: HDPool-API] => Unknown cmd received: ${msg.cmd}. The following data was sent: ${JSON.stringify(msg)}`);
    }
  }

  updateStats() {
    this.requestUserInfo();
    this.requestGeneralStats();
    this.requestMiners();
    this.requestExpectedProfit();
  }

  sendHeartbeat() {
    this.client.send(JSON.stringify({
      cmd: 'online.heartbeat',
    }));
  }

  requestUserInfo() {
    this.client.send(JSON.stringify({
      chk: new Date().getTime(),
      cmd: 'logind.get_uinfo',
      para: {
        uid: this.dashboard.user_id,
      },
    }));
  }

  requestGeneralStats() {
    this.client.send(JSON.stringify({
      chk: new Date().getTime(),
      cmd: 'apid.get_index_data',
      para: {
        uid: this.dashboard.user_id,
        type: 'bhd',
      },
    }));
  }

  requestMiners() {
    this.client.send(JSON.stringify({
      chk: new Date().getTime(),
      cmd: 'apid.get_mill_list',
      para: {
        uid: this.dashboard.user_id,
        type: 'bhd',
      },
    }));
  }
  requestExpectedProfit() {
    this.client.send(JSON.stringify({
      chk: new Date().getTime(),
      cmd: 'apid.get_expected_profit',
      para: {
        uid: this.dashboard.user_id,
        type: 'bhd',
        offset: 0,
        count: 200,
      },
    }));
  }

  cleanup() {
    this.client.close();
    super.cleanup();
  }
};
