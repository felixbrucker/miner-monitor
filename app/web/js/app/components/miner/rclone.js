function RcloneController() {
  var ctrl = this;

  ctrl.totalGib = () => {
    return ctrl.rclones.reduce((acc, rclone) => acc + ((rclone.stats && rclone.stats.totalGib) || 0), 0);
  };
  ctrl.totalTransferredGib = () => {
    return ctrl.rclones.reduce((acc, rclone) => acc + ((rclone.stats && rclone.stats.transferredGib) || 0), 0);
  };
  ctrl.totalSpeedInMibPerSec = () => {
    return ctrl.rclones.reduce((acc, rclone) => acc + ((rclone.stats && rclone.stats.speedInMibPerSec) || 0), 0);
  };
  ctrl.totalProgress = () => {
    return (ctrl.totalTransferredGib() / ctrl.totalGib()) * 100;
  };
  ctrl.getFormattedEta = (rcloneStats) => {
    const remainingGib = rcloneStats.totalGib - rcloneStats.transferredGib;
    const speedInGibPerSec = rcloneStats.speedInMibPerSec / 1024;
    if (speedInGibPerSec === 0) {
      return 'unknown'
    }
    const etaInSeconds = remainingGib / speedInGibPerSec;

    return moment.duration(etaInSeconds, 'seconds').humanize();
  }
  ctrl.getTotalFormattedEta = () => {
    const remainingGib = ctrl.totalGib() - ctrl.totalTransferredGib()
    const speedInGibPerSec = ctrl.totalSpeedInMibPerSec() / 1024;
    if (speedInGibPerSec === 0) {
      return 'unknown'
    }
    const etaInSeconds = remainingGib / speedInGibPerSec;

    return moment.duration(etaInSeconds, 'seconds').humanize();
  }
}

angular.module('app').component('rclone', {
  templateUrl: 'views/partials/components/miner/rclone.html',
  controller: RcloneController,
  bindings: {
    rclones: '<',
  }
});

