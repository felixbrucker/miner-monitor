const https = require('https');
const axios = require('axios');
const bytes = require('bytes');
const Miner = require('./miner');
const problemService = require('../services/problem-service');

module.exports = class Storj extends Miner {

  mergeStats(newShareStats) {
    const obj = Object.assign({}, this.stats);
    obj.totalSpaceUsed = 0;
    obj.totalChange = 0;
    obj.totalPeers = 0;
    obj.totalRestarts = 0;
    obj.totalShardsReceived = 0;
    obj.shares = newShareStats.map(share => {
      const oldShareData = (this.stats && this.stats.shares) ?
        this.stats.shares.find(oldShare => share.id === oldShare.id) : null;
      if (oldShareData) {
        // merge old data not present in new
        share.meta.farmerState =  Object.assign(oldShareData.meta.farmerState, share.meta.farmerState);
        share = Object.assign(oldShareData, share);
      }

      if (!share.lastSpaceUpdate) {
        share.lastSpaceUpdate = Date.now();
        share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes || 0;
      }
      if ((Date.now() - share.lastSpaceUpdate) / 1000 > 60 * 60 * 12) {
        // we need to save the current space used
        share.lastSpaceUpdate = Date.now();
        share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes || 0;
      }
      // calculate diff
      const change = (share.meta.farmerState.spaceUsedBytes || 0) - share.meta.farmerState.lastSpaceUsed;
      if (change < 0) {
        share.meta.farmerState.change = `- ${bytes(-1 * change)}`;
      } else {
        share.meta.farmerState.change = `+ ${bytes(change)}`;
      }
      if (share.meta.farmerState.percentUsed === '...') {
        share.meta.farmerState.percentUsed = '0';
      }
      if (share.meta.farmerState.spaceUsed === '...') {
        share.meta.farmerState.spaceUsed = '0B';
      }
      share.meta.farmerState.changeBytes = change;

      obj.totalChange += share.meta.farmerState.changeBytes;
      obj.totalSpaceUsed += share.meta.farmerState.spaceUsedBytes || 0;
      obj.totalPeers += share.meta.farmerState.totalPeers;
      obj.totalRestarts += share.meta.numRestarts;
      obj.totalShardsReceived += share.meta.farmerState.dataReceivedCount;

      return share;
    });

    obj.avgPeers = obj.totalPeers / obj.shares.length;
    if (obj.totalChange < 0) {
      obj.totalChange = `- ${bytes(-1 * obj.totalChange)}`;
    } else {
      obj.totalChange = `+ ${bytes(obj.totalChange)}`;
    }
    obj.totalSpaceUsed = bytes(obj.totalSpaceUsed);

    return obj;
  }

  async getBridgeStats(id) {
    const bridgeStats = await axios.get(`https://api.storj.io/contacts/${id}`);
    return bridgeStats.data;
  }

  async updateBridgeStats() {
    if (!(this.stats && this.stats.shares)) {
      return;
    }
    let avgRt = 0;
    let avgTr = 0;
    let avgRp = 0;
    let counter1 = 0;
    let counter2 = 0;
    let counter3 = 0;
    await Promise.all(this.stats.shares.map(async share => {
      let bridgeStats = null;
      try {
        bridgeStats = await this.getBridgeStats(share.id);
        // avoid writing to old overwritten data
        const newShare = this.stats.shares.find(sh => sh.id === share.id);
        if (bridgeStats.responseTime !== undefined) {
          newShare.rt = bridgeStats.responseTime > 1000 ? `${(bridgeStats.responseTime / 1000).toFixed(2)} s` : `${bridgeStats.responseTime.toFixed(0)} ms`;
          avgRt += bridgeStats.responseTime;
          counter1 += 1;
        } else {
          newShare.rt = 'N/A';
        }
        if (bridgeStats.timeoutRate !== undefined) {
          newShare.tr = `${(bridgeStats.timeoutRate * 100).toFixed(2)} %`;
        } else {
          newShare.tr = '0.00 %';
        }
        newShare.hasTr = ((bridgeStats.timeoutRate || 0) !== 0);
        newShare.rp = bridgeStats.reputation || 0;
        avgTr += bridgeStats.timeoutRate || 0;
        counter2 += 1;
        avgRp += bridgeStats.reputation || 0;
        counter3 += 1;
      } catch (error) {
        console.log(`[${this.device.name} :: Storj-Bridge-API] => ${error.message}`);
      }
    }));
    avgRp = avgRp / (counter3 ? counter3 : 1);
    avgRt = avgRt / (counter1 ? counter1 : 1);
    avgTr = avgTr / (counter2 ? counter2 : 1);
    this.stats.avgRt = avgRt > 1000 ? `${(avgRt / 1000).toFixed(2)} s` : `${avgRt.toFixed(0)} ms`;
    this.stats.avgTr = `${(avgTr * 100).toFixed(2)} %`;
    this.stats.avgRp = avgRp.toFixed(0);
  }

  async updateStats() {
    try {
      const agent = new https.Agent({
        rejectUnauthorized: false
      });
      const minerData = await axios.get(`${this.device.hostname}/status`, {httpsAgent: agent});
      await problemService.handleProblem(this.constructOnlineProblem());
      this.stats = this.mergeStats(minerData.data.data);
    } catch(err) {
      this.stats = null;
      console.error(`[${this.device.name} :: Storj] => ${err.message}`);
      await problemService.handleProblem(this.constructOfflineProblem());
    }
  }

  getStats() {
    return Object.assign(super.getStats(), {stats: this.stats, id: this.device.id});
  }

  onInit() {
    super.onInit();
    this.bridgeStatsInterval = 2 * 60 * 1000;
    this.updateBridgeStats();
    this.runningBridgeStatsInterval = setInterval(this.updateBridgeStats.bind(this), this.bridgeStatsInterval);
  }

  cleanup() {
    super.cleanup();
    if (this.runningBridgeStatsInterval) {
      clearInterval(this.runningBridgeStatsInterval);
      this.runningBridgeStatsInterval = null;
    }
  }
};
