function HDPoolController() {
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
}

angular.module('app').component('hdpool', {
  templateUrl: 'views/partials/components/pools/hdpool.html',
  controller: HDPoolController,
  bindings: {
    dashboards: '<',
  }
});

