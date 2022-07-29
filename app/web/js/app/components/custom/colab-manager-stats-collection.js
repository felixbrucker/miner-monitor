function ColabManagerStatsCollectionController() {
  var ctrl = this;

  ctrl.elapsedSince = function(date) {
    if (!date) {
      return 'N/A';
    }

    return moment().to(date, true);
  };

  ctrl.formatDuration = function(durationInMs) {
    if (!durationInMs) {
      return 'N/A';
    }

    return moment.duration(durationInMs).humanize()
  };
}

angular.module('app').component('colabManagerStatsCollection', {
  templateUrl: 'views/partials/components/custom/colab-manager-stats-collection.html',
  controller: ColabManagerStatsCollectionController,
  bindings: {
    dashboard: '<',
  }
});

