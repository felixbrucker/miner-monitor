function MiningpoolhubController() {
  var ctrl = this;
  ctrl.hidden = {};

  ctrl.parseName = function(name) {
    return (isNaN(name.charAt(0)) ? name : name.substr(1));
  };

  ctrl.toggleHidden = function(id) {
    ctrl.hidden[id] = !ctrl.hidden[id];
  };

  ctrl.isHidden = function(id) {
    return ctrl.hidden[id];
  }
}

angular.module('app').component('miningpoolhub', {
  templateUrl: 'views/partials/components/pools/miningpoolhub.html',
  controller: MiningpoolhubController,
  bindings: {
    dashboard: '<',
  }
});

