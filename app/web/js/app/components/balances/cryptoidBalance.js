function CryptoidBalanceController() {
  var ctrl = this;

  ctrl.getFiatTotal = () => {
    return ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .map(dashboard => dashboard.data.balanceFiat ? dashboard.data.balanceFiat : 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('cryptoidBalance', {
  templateUrl: 'views/partials/components/balances/cryptoidBalance.html',
  controller: CryptoidBalanceController,
  bindings: {
    dashboards: '<',
  }
});

