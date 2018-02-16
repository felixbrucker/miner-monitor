function MposController() {
  var ctrl = this;
  ctrl.hidden = {};

  ctrl.toggleHidden = function(id) {
    ctrl.hidden[id] = !ctrl.hidden[id];
  };

  ctrl.isHidden = function(id) {
    return ctrl.hidden[id];
  }
}

angular.module('app').component('mpos', {
  templateUrl: 'views/partials/components/pools/mpos.html',
  controller: MposController,
  bindings: {
    dashboards: '<',
  }
});

