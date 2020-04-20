function FoxyPoolController() {
  var ctrl = this;
  ctrl.visible = {};

  ctrl.toggleVisible = function(id) {
    ctrl.visible[id] = !ctrl.visible[id];
  };

  ctrl.isVisible = function(id) {
    return !!ctrl.visible[id];
  };

  ctrl.timeTillRoundFinished = function(currentRoundEndDate) {
    return moment().to(currentRoundEndDate, true);
  };

  ctrl.getMachineState = (pool, machine) => {
    if (pool.data.currentHeight - machine.lastSubmitHeight > 6) {
      return 0;
    }
    if (pool.data.currentHeight - machine.lastSubmitHeight > 3) {
      return 2;
    }

    return 1;
  };

  ctrl.getFormattedCapacity = (capacityInGiB, precision = 2)  => {
    if (isNaN(parseFloat(capacityInGiB)) || !isFinite(capacityInGiB)) {
      return 'N/A';
    }
    if (capacityInGiB === 0) {
      return 'N/A';
    }
    const units = ['GiB', 'TiB', 'PiB', 'EiB'];
    let capacity = capacityInGiB;
    let unit = 0;
    while (capacity >= 1024) {
      capacity /= 1024;
      unit += 1;
    }

    return `${capacity.toFixed(precision)} ${units[unit]}`;
  };

  ctrl.getFormattedAmount = (amount) => parseFloat(amount);
}

angular.module('app').component('foxyPool', {
  templateUrl: 'views/partials/components/pools/foxy-pool.html',
  controller: FoxyPoolController,
  bindings: {
    pools: '<',
  }
});

