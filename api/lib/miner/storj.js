const axios = require('axios');
const moment = require('moment');
const semver = require('semver');

const Miner = require('./miner');
const coinGecko = require('../rates/coingecko');

module.exports = class Storj extends Miner {
  onInit() {
    this.client = axios.create({
      baseURL: `${this.device.hostname}/api/sno`,
    });
    this.historicalBandwidth = [];
    this.ingressSpeed = 0;
    this.egressSpeed = 0;
    this.updateHistoricalbandwidthInterval = setInterval(this.updateHistoricalBandwidth.bind(this), 60 * 1000);
    this.latestVersion = null;
    this.updateLatestVersionInterval = setInterval(this.updateLatestVersion.bind(this), 10 * 60 * 1000);
    this.updateLatestVersion();
    super.onInit();
  }

  async updateLatestVersion() {
    try {
      const { data } = await axios.get('https://version.storj.io');
      this.latestVersion = data.processes.storagenode.suggested.version;
    } catch (err) {
      console.error(`[${this.device.name} :: Storj] => Error updating latest version: ${err.message}`);
    }
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
          auditScoreTotal: perSatelliteStats.audit.totalCount ? perSatelliteStats.audit.successCount / perSatelliteStats.audit.totalCount : 1,
          uptimeScoreTotal: perSatelliteStats.uptime.totalCount ? perSatelliteStats.uptime.successCount / perSatelliteStats.uptime.totalCount : 1,
          auditScore: perSatelliteStats.audit.score,
          suspensionScore: perSatelliteStats.audit.unknownScore,
          onlineScore: perSatelliteStats.onlineScore,
        };
        if (perSatelliteStats.audit.totalCount === 0) {
          satellite.stats.vettingProgress = 1;
        }
      }
      const { data: satelliteStats } = await this.client.get('/satellites');
      stats.egressSummary = satelliteStats.egressSummary;
      stats.ingressSummary = satelliteStats.ingressSummary;

      stats.uptime = Math.floor((Date.now() - (new Date(stats.startedAt)).getTime()) / 1000);

      if (this.latestVersion && semver.gt(this.latestVersion, stats.version)) {
        stats.upToDate = false;
        stats.latestVersion = this.latestVersion;
      }

      const { data: estimatedPayoutData } = await this.client.get('/estimated-payout');
      stats.estimatedPayoutUsd = estimatedPayoutData.currentMonth.payout / 100;
      const rate = coinGecko.getRates('usdt')[0];
      if (rate) {
        stats.estimatedPayoutFiat = parseFloat(rate.current_price) * stats.estimatedPayoutUsd;
      }

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
