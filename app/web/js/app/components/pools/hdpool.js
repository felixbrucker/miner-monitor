function HDPoolController() {
  var ctrl = this;
  ctrl.hidden = {};

  ctrl.toggleVisible = function(id) {
    ctrl.hidden[id] = !ctrl.hidden[id];
  };

  ctrl.isVisible = function(id) {
    return !ctrl.hidden[id];
  };

  ctrl.timeTillRoundFinished = function(currentRoundEndDate) {
    return moment().to(currentRoundEndDate, true);
  };

  ctrl.timeTillRoundFinishedInHours = function(currentRoundEndDate) {
    return moment(currentRoundEndDate).diff(moment(), 'hours');
  };

  ctrl.getTotal = (key) => {
    return ctrl.dashboards
      .filter(dashboard => dashboard.data)
      .map(dashboard => dashboard.data[key] ? dashboard.data[key] : 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('hdpool', {
  templateUrl: 'views/partials/components/pools/hdpool.html',
  controller: HDPoolController,
  bindings: {
    dashboards: '<',
  }
});

