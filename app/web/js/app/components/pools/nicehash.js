function NicehashController() {
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

  ctrl.filterActiveDevices = (devices) => devices.filter(device => device.status.enumName !== 'DISABLED');
}

angular.module('app').component('nicehash', {
  templateUrl: 'views/partials/components/pools/nicehash.html',
  controller: NicehashController,
  bindings: {
    dashboard: '<',
  }
});

