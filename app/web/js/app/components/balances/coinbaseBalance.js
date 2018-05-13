function CoinbaseBalanceController() {
  var ctrl = this;

  ctrl.getFiatTotal = () => {
    return ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .reduce((acc, dashboard) => acc.concat(dashboard.data), [])
      .map(entry => entry.balanceFiat ? entry.balanceFiat : 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('coinbaseBalance', {
  templateUrl: 'views/partials/components/balances/coinbaseBalance.html',
  controller: CoinbaseBalanceController,
  bindings: {
    dashboards: '<',
  }
});

