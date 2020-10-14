function ChiaMinerController() {
  var ctrl = this;

  ctrl.getState = (stats) => {
    if (!stats) {
      return 'N/A';
    }
    if (!stats.connected) {
      return 'Reconnecting';
    }
    if (stats.currentlyScanning) {
      return 'Connected > Scanning';
    }
    return 'Connected > Idle';
  };

  ctrl.getStatus = (stats) => {
    if (!stats) {
      return 0;
    }
    if (!stats.connected) {
      return 1;
    }
    return 2;
  };

  ctrl.getFormattedElapsedDuration = (stats) => {
    if (!stats) {
      return 'N/A';
    }
    const elapsedTimeInSeconds = moment().diff(moment(stats.lastChallengeReceived), 'seconds');
    const duration = moment.duration(elapsedTimeInSeconds, 'seconds');
    if (duration.days() > 0) {
      return `${duration.days()}d ${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    }

    return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
  };

  ctrl.totalCapacityInGib = () => {
    return ctrl.miners.reduce((acc, miner) => acc + (miner.stats.capacityInGib || 0), 0);
  };

  ctrl.totalExpectedTibPerMonth = () => {
    return ctrl.plotJobs.reduce((acc, plotJob) => acc + plotJob.expectedTibPerMonth, 0);
  };

  ctrl.atLeastOneJobHasEta = () => {
    return ctrl.plotJobs.some((plotJob) => !!plotJob.avgPlotTimeInSeconds);
  };

  ctrl.plotJobWithLowestEta = () => {
    return ctrl.plotJobs.reduce((acc, plotJob) => {
      if (!acc) {
        return plotJob;
      }
      const accElapsedTimeInSeconds = moment().diff(moment(acc.startedAt), 'seconds');
      const accEtaInSeconds = Math.max(acc.avgPlotTimeInSeconds - accElapsedTimeInSeconds, 0);
      const elapsedTimeInSeconds = moment().diff(moment(plotJob.startedAt), 'seconds');
      const etaInSeconds = Math.max(plotJob.avgPlotTimeInSeconds - elapsedTimeInSeconds, 0);
      return accEtaInSeconds < etaInSeconds ? acc : plotJob;
    }, null);
  };

  ctrl.getFormattedEta = (plotJob) => {
    const elapsedTimeInSeconds = moment().diff(moment(plotJob.startedAt), 'seconds');
    const etaInSeconds = Math.max(plotJob.avgPlotTimeInSeconds - elapsedTimeInSeconds, 0);

    const duration = moment.duration(etaInSeconds, 'seconds');
    if (duration.days() > 0) {
      return `${duration.days()}d ${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    }

    return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
  }
}

angular.module('app').component('chiaMiner', {
  templateUrl: 'views/partials/components/miner/chia-miner.html',
  controller: ChiaMinerController,
  bindings: {
    miners: '<',
  }
});

