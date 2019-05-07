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
}

angular.module('app').component('hdpoolControl', {
  templateUrl: 'views/partials/components/custom/hdpool-control.html',
  controller: HDPoolControlController,
  bindings: {
    dashboard: '<',
  }
});

