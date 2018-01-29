function BitcoinBalanceController() {
  var ctrl = this;
}

angular.module('app').component('bitcoinBalance', {
  templateUrl: 'views/partials/components/balances/bitcoinBalance.html',
  controller: BitcoinBalanceController,
  bindings: {
    dashboards: '<',
  }
});

