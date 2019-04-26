function StorjController($http) {
  var ctrl = this;
  ctrl.hidden = false;

  ctrl.toggleHidden = function() {
    ctrl.hidden = !ctrl.hidden;
  };

  ctrl.secondsSince = function(date) {
    return (Date.now() - date) / 1000;
  };

  ctrl.getStatus = function(lastContacted) {
    if (!lastContacted) {
      return 0;
    }
    if (moment(lastContacted).isBefore(moment().subtract(10, 'minute'))) {
      return 1;
    }

    return 2;
  };
}

angular.module('app').component('storj', {
  templateUrl: 'views/partials/components/miner/storj.html',
  controller: StorjController,
  bindings: {
    entry: '<',
  }
});

