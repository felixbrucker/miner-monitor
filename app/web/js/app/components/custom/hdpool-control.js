function HDPoolControlController() {
  var ctrl = this;
  ctrl.hidden = {};

  ctrl.toggleVisible = function(id) {
    ctrl.hidden[id] = !ctrl.hidden[id];
  };

  ctrl.isVisible = function(id) {
    return !ctrl.hidden[id];
  };

  ctrl.timeTillRoundFinished = function(currentRoundEndDate) {
    return moment().to(currentRoundEndDate, true);
  };

  ctrl.timeTillRoundFinishedInHours = function(currentRoundEndDate) {
    return moment(currentRoundEndDate).diff(moment(), 'hours');
  };

  ctrl.getTotal = (key) => {
    return ctrl.dashboard.data
      .filter(account => account.stats)
      .map(account => account.stats[key] ? account.stats[key] : 0)
      .reduce((acc, right) => acc + right, 0);
  };

  ctrl.capacityToString = function(capacityInGiB, precision = 2, correctUnit = true) {
    let capacity = capacityInGiB;
    let unit = 0;
    const units = correctUnit ? ['GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] : ['GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    while (capacity >= 1024) {
      capacity /= 1024;
      unit += 1;
    }

    return `${capacity.toFixed(precision)} ${units[unit]}`;
  };

  ctrl.getState = function(stats, state) {
    if (state === 0) {
      return 0;
    }
    if (state !== 4) {
      return 1;
    }
    if (!stats || !stats.miners || stats.miners.length === 0) {
      return 2;
    }

    return stats.miners.reduce((acc, miner) => {
      if (miner.online) {
        return 5;
      }
      if (!miner.submitting && acc < 5) {
        return 4;
      }
      if (!miner.online && acc < 4) {
        return 3;
      }

      return acc;
    }, 3);
  };
}

angular.module('app').component('hdpoolControl', {
  templateUrl: 'views/partials/components/custom/hdpool-control.html',
  controller: HDPoolControlController,
  bindings: {
    dashboard: '<',
  }
});

