function StorjController() {
  var ctrl = this;
  ctrl.hidden = false;

  ctrl.toggleHidden = function() {
    ctrl.hidden = !ctrl.hidden;
  };

  ctrl.secondsSince = function(date) {
    return (Date.now() - date) / 1000;
  }
}

angular.module('app').component('storj', {
  templateUrl: 'views/partials/components/miner/storj.html',
  controller: StorjController,
  bindings: {
    entry: '<',
  }
});

