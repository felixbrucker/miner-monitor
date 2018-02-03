function CoinbaseBalanceController() {
  var ctrl = this;
}

angular.module('app').component('coinbaseBalance', {
  templateUrl: 'views/partials/components/balances/coinbaseBalance.html',
  controller: CoinbaseBalanceController,
  bindings: {
    dashboards: '<',
  }
});

