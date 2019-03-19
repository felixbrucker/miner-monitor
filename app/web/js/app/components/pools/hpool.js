function HPoolController() {
  var ctrl = this;
  ctrl.hidden = {};

  ctrl.toggleVisible = function(id) {
    ctrl.hidden[id] = !ctrl.hidden[id];
  };

  ctrl.isVisible = function(id) {
    return !ctrl.hidden[id];
  };

  ctrl.timeTillRoundFinished = function(lastPayedTs) {
    return moment().to(moment(lastPayedTs).add(1, 'day'), true);
  };

  ctrl.timeTillRoundFinishedInHours = function(lastPayedTs) {
    return moment(lastPayedTs).add(1, 'day').diff(moment(), 'hours');
  };

  ctrl.getTotal = (key) => {
    return ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .map(dashboard => dashboard.data[key] ? dashboard.data[key] : 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('hpool', {
  templateUrl: 'views/partials/components/pools/hpool.html',
  controller: HPoolController,
  bindings: {
    dashboards: '<',
  }
});

