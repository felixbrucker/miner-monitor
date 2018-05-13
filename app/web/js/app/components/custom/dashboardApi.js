function DashboardApiController() {
  var ctrl = this;

  ctrl.getFiatTotal = () => {
    return ctrl.dashboard.data.totalEthFiat + ctrl.dashboard.data.totalStorjFiat;
  };
}

angular.module('app').component('dashboardApi', {
  templateUrl: 'views/partials/components/custom/dashboardApi.html',
  controller: DashboardApiController,
  bindings: {
    dashboard: '<',
  }
});

