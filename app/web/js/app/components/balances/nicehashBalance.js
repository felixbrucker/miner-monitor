function NicehashBalanceController() {
  var ctrl = this;
}

angular.module('app').component('nicehashBalance', {
  templateUrl: 'views/partials/components/balances/nicehashBalance.html',
  controller: NicehashBalanceController,
  bindings: {
    dashboards: '<',
  }
});

