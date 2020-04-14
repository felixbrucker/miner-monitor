const axios = require('axios');
const moment = require('moment');
const Miner = require('./miner');

module.exports = class Storj extends Miner {
  onInit() {
    this.client = axios.create({
      baseURL: `${this.device.hostname}/api/sno`,
    });
    this.historicalBandwidth = [];
    this.ingressSpeed = 0;
    this.egressSpeed = 0;
    this.updateHistoricalbandwidthInterval = setInterval(this.updateHistoricalBandwidth.bind(this), 60 * 1000);
    super.onInit();
  }

  async updateStats() {
    try {
      const { data: stats } = await this.client.get('/');
      for (let satellite of stats.satellites) {
        const { data: perSatelliteStats } = await this.client.get(`/satellite/${satellite.id}`);
        satellite.stats = {
          storageSummary: perSatelliteStats.storageSummary,
          bandwidthSummary: perSatelliteStats.bandwidthSummary,
          egressSummary: perSatelliteStats.egressSummary,
          ingressSummary: perSatelliteStats.ingressSummary,
          vettingProgress: perSatelliteStats.audit.successCount < 100 ? perSatelliteStats.audit.successCount / 100 : 1,
          auditScore: perSatelliteStats.audit.totalCount ? perSatelliteStats.audit.successCount / perSatelliteStats.audit.totalCount : 1,
          uptimeScore: perSatelliteStats.uptime.totalCount ? perSatelliteStats.uptime.successCount / perSatelliteStats.uptime.totalCount : 1,
        };
        if (perSatelliteStats.audit.totalCount === 0) {
          satellite.stats.vettingProgress = 1;
        }
      }
      const { data: satelliteStats } = await this.client.get('/satellites');
      stats.egressSummary = satelliteStats.egressSummary;
      stats.ingressSummary = satelliteStats.ingressSummary;

      stats.uptime = Math.floor((Date.now() - (new Date(stats.startedAt)).getTime()) / 1000);

      this.stats = stats;
    } catch (err) {
      this.stats = null;
      console.error(`[${this.device.name} :: Storj] => ${err.message}`);
    }
  }

  updateHistoricalBandwidth() {
    if (!this.stats) {
      return;
    }
    const newBandwidthEntry = [new Date(), this.stats.ingressSummary, this.stats.egressSummary];
    this.historicalBandwidth.push(newBandwidthEntry);
    this.historicalBandwidth = this.historicalBandwidth.filter(([entryTS]) => moment().diff(entryTS, 'minute') < 15);
    this.updateBandwidthSpeeds();
  }

  updateBandwidthSpeeds() {
    const oldestBandwidthEntry = this.historicalBandwidth.length === 0
      ? [new Date(), this.stats.ingressSummary, this.stats.egressSummary]
      : this.historicalBandwidth[0];
    let timeInSecondsSince = moment().diff(oldestBandwidthEntry[0], 'second');

    const differences = [this.stats.ingressSummary - oldestBandwidthEntry[1], this.stats.egressSummary - oldestBandwidthEntry[2]];
    if (differences[0] < 0) {
      differences[0] = this.stats.ingressSummary;
      timeInSecondsSince = moment().diff(moment().startOf('day'), 'second');
    }
    if (differences[1] < 0) {
      differences[1] = this.stats.egressSummary;
      timeInSecondsSince = moment().diff(moment().startOf('day'), 'second');
    }

    this.ingressSpeed = differences[0] / timeInSecondsSince;
    this.egressSpeed = differences[1] / timeInSecondsSince;
  }

  getStats() {
    return Object.assign(
      super.getStats(),
      {
        stats: this.stats,
        id: this.device.id,
      }, {
        ingressSpeed: this.ingressSpeed,
        egressSpeed: this.egressSpeed,
      });
  }



  cleanup() {
    if (this.updateHistoricalbandwidthInterval) {
      clearInterval(this.updateHistoricalbandwidthInterval);
      this.updateHistoricalbandwidthInterval = null;
    }
    super.cleanup();
  }
};
