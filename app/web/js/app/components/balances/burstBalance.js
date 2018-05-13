function BurstBalanceController() {
  var ctrl = this;

  ctrl.getFiatTotal = () => {
    return ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .map(dashboard => dashboard.data.balanceFiat ? dashboard.data.balanceFiat : 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('burstBalance', {
  templateUrl: 'views/partials/components/balances/burstBalance.html',
  controller: BurstBalanceController,
  bindings: {
    dashboards: '<',
  }
});

