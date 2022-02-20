function BalanceSummaryController() {
  const ctrl = this;
  ctrl.visible = {};

  ctrl.toggleVisible = (id) => {
    ctrl.visible[id] = !ctrl.visible[id];
  };

  ctrl.isVisible = (id) => ctrl.visible[id];

  ctrl.getTotalForBalances = (balances, key) => {
    return balances
      .filter(dashboard => dashboard && dashboard.data)
      .map(dashboard => dashboard.data[key] || 0)
      .reduce((acc, right) => acc + right, 0);
  };

  ctrl.getTotal = (key) => {
    return ctrl.dashboards
      .filter(dashboard => dashboard && dashboard.balances)
      .reduce((acc, dashboard) => acc.concat(dashboard.balances), [])
      .filter(dashboard => dashboard && dashboard.data)
      .map(dashboard => dashboard.data[key] || 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('balanceSummary', {
  templateUrl: 'views/partials/components/balances/balance-summary.html',
  controller: BalanceSummaryController,
  bindings: {
    dashboards: '<',
  }
});

