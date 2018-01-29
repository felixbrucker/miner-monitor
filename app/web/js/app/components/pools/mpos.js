function MposController() {
  var ctrl = this;

  ctrl.parseName = function(name) {
    return (isNaN(name.charAt(0)) ? name : name.substr(1));
  };
}

angular.module('app').component('mpos', {
  templateUrl: 'views/partials/components/pools/mpos.html',
  controller: MposController,
  bindings: {
    dashboard: '<',
  }
});

