const IO = require('socket.io-client');
const bytes = require('bytes');
const Miner = require('./miner');

module.exports = class BurstProxy extends Miner {
  static getBurstBlockReward(blockHeight) {
    const month = Math.floor(blockHeight / 10800);
    return 10000 * Math.pow(95, month) / Math.pow(100, month);
  }

  static getBHDBlockReward() {
    return 23.75;
  }

  getStats() {
    return Object.assign(super.getStats(), {stats: this.stats});
  }

  onInit() {
    this.client = IO(this.device.hostname);

    this.client.on('stats', this.onStats.bind(this));
  }

  onStats(upstreams) {
    upstreams.forEach(upstream => {
      upstream.isBHD = upstream.name.toLowerCase().indexOf('bhd') !== -1;
      upstream.blockTime = upstream.isBHD ? 300 : 240;

      const blockReward = upstream.isBHD ? BurstProxy.getBHDBlockReward() : BurstProxy.getBurstBlockReward(upstream.blockNumber);

      upstream.totalCapacityString = bytes(upstream.totalCapacity);
      const capacityInTB = upstream.totalCapacity / Math.pow(1000, 4);
      const probabilityToFindBlock = capacityInTB / upstream.netDiff;
      if (probabilityToFindBlock !== 0) {
        upstream.timeToFindBlockInSeconds = 1 / probabilityToFindBlock * upstream.blockTime;
        const timeToFindBlockInDays = upstream.timeToFindBlockInSeconds / (60 * 60 * 24);
        upstream.rewardsPerDay = blockReward / timeToFindBlockInDays;
      }
    });
    this.stats = upstreams;
  }
};
