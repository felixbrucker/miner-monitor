function MinerManagerController() {
  var ctrl = this;
}

angular.module('app').component('minerManager', {
  templateUrl: 'views/partials/components/miner/minerManager.html',
  controller: MinerManagerController,
  bindings: {
    entry: '<',
  }
});

