const WebSocket = require('ws');
const ReconnectingWebSocket  = require('reconnecting-websocket');
const bytes = require('bytes');
const Miner = require('./miner');

const reconnectInterval = 60 * 60 * 1000; // 1 hr

module.exports = class CreepMiner extends Miner {
  getStats() {
    return Object.assign(super.getStats(), {stats: this.stats});
  }

  onInit() {
    const isBHD = this.device.name.toLowerCase().indexOf('bhd') !== -1;
    this.blockTime = isBHD ? 300 : 240;

    this.client = new ReconnectingWebSocket(`ws://${this.device.hostname}`, [], {
      WebSocket,
    });

    this.client.addEventListener('message', this.onMessage.bind(this));
    // Update the total plotSize regularly
    setInterval(() => this.client.reconnect(), reconnectInterval);
  }

  cleanup() {
    this.client.close();
    super.cleanup();
  }

  onMessage(message) {
    const data = message.data;
    if (!data) {
      return;
    }
    if (data === 'ping') {
      return;
    }
    const res = JSON.parse(data);
    switch (res.type) {
      case 'new block':
        this.stats.block = res.block;
        this.stats.blockStart = parseInt(res.startTime, 10);
        this.stats.difficulty = parseInt(res.difficulty, 10);
        this.stats.blocksWon = parseInt(res.blocksWon, 10);
        this.stats.roundsSubmitted = parseInt(res.nRoundsSubmitted, 10);
        this.stats.numHistoricals = parseInt(res.numHistoricals, 10);
        this.stats.bestDL = null;
        this.stats.dlBelowTenMinutes = res.bestDeadlines.filter(dl => parseInt(dl[1], 10) < 600).length;
        const probabilityToFindBlock = (this.stats.totalPlotSizeInTB || 0) / this.stats.difficulty;
        if (probabilityToFindBlock !== 0) {
          this.stats.timeToFindBlockInSeconds = 1 / probabilityToFindBlock * this.blockTime;
        }
        break;
      case 'nonce found':
      case 'nonce found (too high)':
        const dl = parseInt(res.deadlineNum, 10);
        if (!this.stats.bestDL || dl < this.stats.bestDL) {
          this.stats.bestDL = dl;
        }
        break;
      case 'nonce confirmed':
      case 'nonce submitted':
        break;
      case 'config':
        this.stats.totalPlotSize = res.totalPlotSize;
        this.stats.totalPlotSizeInTB = bytes(res.totalPlotSize) / (1000 * 1000 * 1000 * 1000);
        break;
      default:
        break;
    }
  }
};
