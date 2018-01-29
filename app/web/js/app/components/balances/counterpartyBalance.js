function CounterpartyBalanceController() {
  var ctrl = this;
}

angular.module('app').component('counterpartyBalance', {
  templateUrl: 'views/partials/components/balances/counterpartyBalance.html',
  controller: CounterpartyBalanceController,
  bindings: {
    dashboards: '<',
  }
});

