function EthereumBalanceController() {
  var ctrl = this;

  ctrl.getFiatTotal = () => {
    const tokenFiat = ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .reduce((acc, dashboard) => acc.concat(dashboard.data.tokens), [])
      .map(entry => entry.balanceFiat ? entry.balanceFiat : 0)
      .reduce((acc, right) => acc + right, 0);
    const ethFiat = ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .map(dashboard => dashboard.data.eth.balanceFiat ? dashboard.data.eth.balanceFiat : 0)
      .reduce((acc, right) => acc + right, 0);

    return ethFiat + tokenFiat;
  };
}

angular.module('app').component('ethereumBalance', {
  templateUrl: 'views/partials/components/balances/ethereumBalance.html',
  controller: EthereumBalanceController,
  bindings: {
    dashboards: '<',
  }
});

