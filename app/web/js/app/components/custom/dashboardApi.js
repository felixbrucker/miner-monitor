function DashboardApiController() {
  var ctrl = this;
}

angular.module('app').component('dashboardApi', {
  templateUrl: 'views/partials/components/custom/dashboardApi.html',
  controller: DashboardApiController,
  bindings: {
    dashboard: '<',
  }
});

