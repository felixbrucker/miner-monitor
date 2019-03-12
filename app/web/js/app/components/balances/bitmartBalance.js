function BitmartBalanceController() {
  var ctrl = this;

  ctrl.getFiatTotal = () => {
    return ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .reduce((acc, dashboard) => acc.concat(dashboard.data), [])
      .map(entry => {
        const availableFiat = entry.availableFiat ? entry.availableFiat : 0;
        const frozenFiat = entry.frozenFiat ? entry.frozenFiat : 0;

        return availableFiat + frozenFiat;
      })
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('bitmartBalance', {
  templateUrl: 'views/partials/components/balances/bitmartBalance.html',
  controller: BitmartBalanceController,
  bindings: {
    dashboards: '<',
  }
});

