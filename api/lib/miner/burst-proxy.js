const IO = require('socket.io-client');
const bytes = require('bytes');
const Miner = require('./miner');

module.exports = class BurstProxy extends Miner {
  getStats() {
    return Object.assign(super.getStats(), {stats: this.stats});
  }

  onInit() {
    this.client = IO(this.device.hostname);

    this.client.on('stats', this.onStats.bind(this));
  }

  onStats(upstreams) {
    upstreams.forEach(upstream => {
      const isBHD = upstream.name.toLowerCase().indexOf('bhd') !== -1;
      upstream.blockTime = isBHD ? 300 : 240;

      upstream.totalCapacityString = bytes(upstream.totalCapacity);
      const capacityInTB = upstream.totalCapacity / Math.pow(1000, 4);
      const probabilityToFindBlock = capacityInTB / upstream.netDiff;
      if (probabilityToFindBlock !== 0) {
        upstream.timeToFindBlockInSeconds = 1 / probabilityToFindBlock * upstream.blockTime;
      }
    });
    this.stats = upstreams;
  }
};
