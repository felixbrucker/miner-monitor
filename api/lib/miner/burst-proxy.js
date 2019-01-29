const IO = require('socket.io-client');
const bytes = require('bytes');
const Miner = require('./miner');

module.exports = class BurstProxy extends Miner {
  static getBurstBlockReward(blockHeight) {
    const month = Math.floor(blockHeight / 10800);
    return 10000 * Math.pow(95, month) / Math.pow(100, month);
  }

  static getBHDBlockReward() {
    return 23.75; // simplified
  }

  getStats() {
    return Object.assign(super.getStats(), {stats: this.stats});
  }

  onInit() {
    this.client = IO(this.device.hostname);

    this.client.on('stats', this.onStats.bind(this));
  }

  onStats(proxies) {
    proxies.forEach(proxy => {
      proxy.totalCapacityString = bytes(proxy.totalCapacity);
      proxy.upstreamStats.forEach(upstreamStat => {
        upstreamStat.blockTime = upstreamStat.isBHD ? 300 : 240;

        const blockReward = upstreamStat.isBHD ? BurstProxy.getBHDBlockReward() : BurstProxy.getBurstBlockReward(upstreamStat.blockNumber);

        const capacityInTB = proxy.totalCapacity / Math.pow(1024, 4);
        const probabilityToFindBlock = capacityInTB / upstreamStat.netDiff;
        if (probabilityToFindBlock !== 0) {
          upstreamStat.timeToFindBlockInSeconds = 1 / probabilityToFindBlock * upstreamStat.blockTime;
          const timeToFindBlockInDays = upstreamStat.timeToFindBlockInSeconds / (60 * 60 * 24);
          upstreamStat.rewardsPerDay = blockReward / timeToFindBlockInDays;
        }
        upstreamStat.performanceString = bytes(upstreamStat.estimatedCapacityInTB * Math.pow(1024, 4));

        upstreamStat.totalCapacity = proxy.totalCapacity;
        upstreamStat.totalCapacityString = proxy.totalCapacityString;
        upstreamStat.miner = proxy.miner;
      });
    });

    this.stats = proxies.reduce((upstreamStats , proxy) => upstreamStats.concat(proxy.upstreamStats), []);
  }
};
