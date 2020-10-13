function ChiaPlotterController() {
  var ctrl = this;

  ctrl.totalFreeSpace = () => {
    return ctrl.plotJobs.reduce((acc, plotJob) => acc + plotJob.freeSpaceOnDestinationDirInGib, 0);
  };

  ctrl.totalExpectedTibPerMonth = () => {
    return ctrl.plotJobs.reduce((acc, plotJob) => acc + plotJob.expectedTibPerMonth, 0);
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

angular.module('app').component('chiaPlotter', {
  templateUrl: 'views/partials/components/miner/chia-plotter.html',
  controller: ChiaPlotterController,
  bindings: {
    plotJobs: '<',
  }
});

