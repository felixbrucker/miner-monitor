function EthereumBalanceController() {
  var ctrl = this;
}

angular.module('app').component('ethereumBalance', {
  templateUrl: 'views/partials/components/balances/ethereumBalance.html',
  controller: EthereumBalanceController,
  bindings: {
    dashboards: '<',
  }
});

