function YiimpController() {
  var ctrl = this;
  ctrl.visible = {};

  ctrl.parseName = function(name) {
    return (isNaN(name.charAt(0)) ? name : name.substr(1));
  };

  ctrl.toggleVisible = function(id) {
    ctrl.visible[id] = !ctrl.visible[id];
  };

  ctrl.isVisible = function(id) {
    return ctrl.visible[id];
  }
}

angular.module('app').component('yiimp', {
  templateUrl: 'views/partials/components/pools/yiimp.html',
  controller: YiimpController,
  bindings: {
    dashboards: '<',
  }
});

