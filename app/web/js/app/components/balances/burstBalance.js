function BurstBalanceController() {
  var ctrl = this;
}

angular.module('app').component('burstBalance', {
  templateUrl: 'views/partials/components/balances/burstBalance.html',
  controller: BurstBalanceController,
  bindings: {
    dashboards: '<',
  }
});

