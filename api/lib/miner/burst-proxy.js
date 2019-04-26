const IO = require('socket.io-client');
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
    this.stats = [];
    this.client = IO(`${this.device.hostname}/web-ui`);

    this.client.on('stats/proxy', this.onNewProxyStats.bind(this));
    this.client.on('stats/current-round', this.onNewUpstreamStats.bind(this));
    this.client.on('stats/historical', this.onNewUpstreamStats.bind(this));

    this.client.emit('stats/init', this.onStats.bind(this));
  }

  populateProxyStats(proxy) {
    proxy.totalCapacityString = BurstProxy.capacityToString(proxy.totalCapacity);
    proxy.upstreamStats.forEach(upstreamStat => {
      upstreamStat.blockTime = upstreamStat.isBHD ? 300 : 240;

      const blockReward = upstreamStat.isBHD ? BurstProxy.getBHDBlockReward() : BurstProxy.getBurstBlockReward(upstreamStat.blockNumber);

      const capacityInTB = proxy.totalCapacity / 1024;
      const probabilityToFindBlock = capacityInTB / upstreamStat.netDiff;
      if (probabilityToFindBlock !== 0) {
        upstreamStat.timeToFindBlockInSeconds = 1 / probabilityToFindBlock * upstreamStat.blockTime;
        const timeToFindBlockInDays = upstreamStat.timeToFindBlockInSeconds / (60 * 60 * 24);
        upstreamStat.rewardsPerDay = blockReward / timeToFindBlockInDays;
      }

      upstreamStat.totalCapacity = proxy.totalCapacity;
      upstreamStat.totalCapacityString = proxy.totalCapacityString;
      upstreamStat.miner = proxy.miner;
      this.populateUpstreamStats(upstreamStat);
    });
  }

  populateUpstreamStats(upstream) {
    upstream.performanceString = BurstProxy.capacityToString(upstream.estimatedCapacityInTB * 1024);
  }

  static capacityToString(capacityInGiB, precision = 2, correctUnit = true) {
    let capacity = capacityInGiB;
    let unit = 0;
    const units = correctUnit ? ['GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] : ['GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    while (capacity >= 1024) {
      capacity /= 1024;
      unit += 1;
    }

    return `${capacity.toFixed(precision)} ${units[unit]}`;
  }

  onStats(proxies) {
    proxies.forEach(proxy => {
      this.populateProxyStats(proxy);
    });

    this.stats = proxies;
  }

  onNewProxyStats(proxyName, proxyStats) {
    const stats = this.stats;
    if (!stats) {
      return;
    }
    const proxy = stats.find(proxy => proxy.name === proxyName);
    if (!proxy) {
      return;
    }
    Object.keys(proxyStats).forEach(key => {
      proxy[key] = proxyStats[key];
    });
    this.populateProxyStats(proxy);
  }

  onNewUpstreamStats(fullUpstreamName, upstreamStats) {
    const stats = this.stats;
    if (!stats) {
      return;
    }
    const upstream = stats
      .map(proxy => proxy.upstreamStats)
      .reduce((acc, curr) => acc.concat(curr), [])
      .find(upstream => upstream.fullName === fullUpstreamName);
    if (!upstream) {
      return;
    }
    Object.keys(upstreamStats).forEach(key => {
      upstream[key] = upstreamStats[key];
    });
    this.populateUpstreamStats(upstream);
  }

  cleanup() {
    this.client.disconnect();
    super.cleanup();
  }
};
