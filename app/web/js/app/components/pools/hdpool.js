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
    return moment().to(moment(`${lastPayedTs}+0800`).add(24, 'hours'), true);
  };

  ctrl.timeTillRoundFinishedInHours = function(lastPayedTs) {
    return moment(`${lastPayedTs}+0800`).add(24, 'hours').diff(moment(), 'hours');
  };
}

angular.module('app').component('hdpool', {
  templateUrl: 'views/partials/components/pools/hdpool.html',
  controller: HDPoolController,
  bindings: {
    dashboards: '<',
  }
});

