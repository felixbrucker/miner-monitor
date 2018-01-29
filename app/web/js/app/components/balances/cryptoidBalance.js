function CryptoidBalanceController() {
  var ctrl = this;
}

angular.module('app').component('cryptoidBalance', {
  templateUrl: 'views/partials/components/balances/cryptoidBalance.html',
  controller: CryptoidBalanceController,
  bindings: {
    dashboards: '<',
  }
});

