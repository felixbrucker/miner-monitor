function ChiaArchiverController() {
  var ctrl = this;

  ctrl.totalSpeedInMibPerSecond = () => {
    return ctrl.archiver.stats.reduce((acc, transfer) => acc + transfer.currSpeedInMibPerSecond, 0);
  };

  ctrl.totalWrittenGib = () => {
    return ctrl.archiver.stats.reduce((acc, transfer) => acc + transfer.writtenGib, 0);
  };

  ctrl.totalSizeInGib = () => {
    return ctrl.archiver.stats.reduce((acc, transfer) => acc + transfer.sizeInGib, 0);
  };

  ctrl.lowestEtaFormatted = () => {
    const transferWithLowestEta = ctrl.archiver.stats.reduce((acc, transfer) => {
      if (!acc) {
        return transfer;
      }
      return acc.currRemainingTimeInSeconds < transfer.currRemainingTimeInSeconds ? acc : transfer;
    }, null);
    if (!transferWithLowestEta) {
      return 'N/A';
    }

    return ctrl.getFormattedDuration(transferWithLowestEta.currRemainingTimeInSeconds);
  };

  ctrl.getFormattedDuration = (durationInSeconds) => {
    const duration = moment.duration(durationInSeconds, 'seconds');
    if (duration.days() > 0) {
      return `${duration.days()}d ${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    }

    return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
  }
}

angular.module('app').component('chiaArchiver', {
  templateUrl: 'views/partials/components/miner/chia-archiver.html',
  controller: ChiaArchiverController,
  bindings: {
    archiver: '<',
  }
});

