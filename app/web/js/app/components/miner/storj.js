function StorjController($http) {
  var ctrl = this;
  ctrl.hidden = false;

  ctrl.toggleHidden = function() {
    ctrl.hidden = !ctrl.hidden;
  };

  ctrl.secondsSince = function(date) {
    return (Date.now() - date) / 1000;
  };

  ctrl.getStatus = function() {
    const stats = ctrl.entry.stats;
    if (!stats.lastPinged) {
      return 0;
    }
    if (moment(stats.lastPinged).isBefore(moment().subtract(10, 'minute'))) {
      return 1;
    }
    const satellitesWithLowAuditScore = stats.satellites.filter(satellite => satellite.stats.auditScore <= 0.95);
    const satellitesWithLowUptimeScore = stats.satellites.filter(satellite => satellite.stats.uptimeScore <= 0.9);
    const disqualifiedSatellites = stats.satellites.filter(satellite => satellite.disqualified);
    if (satellitesWithLowAuditScore.length > 0 || satellitesWithLowUptimeScore.length > 0 || disqualifiedSatellites.length > 0) {
      return 2;
    }
    const satellitesCurrentlyVetting = stats.satellites.filter(satellite => satellite.stats.vettingProgress < 1);
    if (satellitesCurrentlyVetting.length > 0) {
      return 3;
    }

    return 4;
  };

  ctrl.getMessages = () => {
    const stats = ctrl.entry.stats;

    const allMessages = stats.satellites.map(satellite => {
      const messages = [];
      if (satellite.stats.auditScore <= 0.95) {
        messages.push(`${satellite.url.replace(':7777', '')} | Low audit score: ${(satellite.stats.auditScore * 100).toFixed(1)}%`);
      }
      if (satellite.stats.uptimeScore <= 0.9) {
        messages.push(`${satellite.url.replace(':7777', '')} | Low uptime score: ${(satellite.stats.uptimeScore * 100).toFixed(1)}%`);
      }
      if (satellite.stats.vettingProgress < 1) {
        messages.push(`${satellite.url.replace(':7777', '')} | Vetting progress: ${(satellite.stats.vettingProgress * 100).toFixed(0)}%`);
      }
      if (satellite.disqualified) {
        messages.push(`${satellite.url.replace(':7777', '')} | Node is disqualified`);
      }

      return messages;
    });

    return allMessages.reduce((acc, curr) => acc.concat(curr), []);
  };
}

angular.module('app').component('storj', {
  templateUrl: 'views/partials/components/miner/storj.html',
  controller: StorjController,
  bindings: {
    entry: '<',
  }
});

