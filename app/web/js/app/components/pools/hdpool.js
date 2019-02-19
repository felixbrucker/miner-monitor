function HDPoolController() {
  var ctrl = this;
  ctrl.hidden = {};

  ctrl.toggleVisible = function(id) {
    ctrl.hidden[id] = !ctrl.hidden[id];
  };

  ctrl.isVisible = function(id) {
    return !ctrl.hidden[id];
  }
}

angular.module('app').component('hdpool', {
  templateUrl: 'views/partials/components/pools/hdpool.html',
  controller: HDPoolController,
  bindings: {
    dashboards: '<',
  }
});

