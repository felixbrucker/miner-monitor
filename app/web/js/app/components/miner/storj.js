function StorjController() {
  var ctrl = this;

  ctrl.getStatus = function(node) {
    const stats = node.stats;
    if (!stats || !stats.lastPinged) {
      return 0;
    }
    if (moment(stats.lastPinged).isBefore(moment().subtract(10, 'minute'))) {
      return 1;
    }
    const satellitesWithLowAuditScore = stats.satellites.filter(satellite => satellite.stats.auditScore <= 0.95 || satellite.stats.auditScoreTotal <= 0.95);
    const satellitesWithLowUptimeScore = stats.satellites.filter(satellite => satellite.stats.uptimeScoreTotal <= 0.9);
    const satellitesWithLowSuspensionScore = stats.satellites.filter(satellite => satellite.stats.suspensionScore <= 0.9);
    const disqualifiedSatellites = stats.satellites.filter(satellite => satellite.disqualified);
    const suspendedSatellites = stats.satellites.filter(satellite => satellite.suspended);
    if (satellitesWithLowAuditScore.length > 0 || satellitesWithLowUptimeScore.length > 0 || satellitesWithLowSuspensionScore.length > 0 || disqualifiedSatellites.length > 0 || suspendedSatellites.length > 0) {
      return 2;
    }
    const satellitesCurrentlyVetting = stats.satellites.filter(satellite => satellite.stats.vettingProgress < 1);
    if (satellitesCurrentlyVetting.length > 0) {
      return 3;
    }

    return 4;
  };

  ctrl.getMessages = (node) => {
    const stats = node.stats;

    if (!stats) {
      return ['Your node is offline'];
    }

    const allMessages = stats.satellites.map(satellite => {
      const messages = [];
      if (satellite.stats.auditScore <= 0.95) {
        messages.push(`${satellite.url.replace(':7777', '')} | Low audit score: ${(satellite.stats.auditScore * 100).toFixed(1)}%`);
      }
      if (satellite.stats.auditScoreTotal <= 0.95) {
        messages.push(`${satellite.url.replace(':7777', '')} | Low total audit score: ${(satellite.stats.auditScoreTotal * 100).toFixed(1)}%`);
      }
      if (satellite.stats.uptimeScoreTotal <= 0.9) {
        messages.push(`${satellite.url.replace(':7777', '')} | Low uptime score: ${(satellite.stats.uptimeScoreTotal * 100).toFixed(1)}%`);
      }
      if (satellite.stats.suspensionScore <= 0.9) {
        messages.push(`${satellite.url.replace(':7777', '')} | Low suspension score: ${(satellite.stats.suspensionScore * 100).toFixed(1)}%`);
      }
      if (satellite.stats.vettingProgress < 1) {
        messages.push(`${satellite.url.replace(':7777', '')} | Vetting progress: ${(satellite.stats.vettingProgress * 100).toFixed(0)}%`);
      }
      if (satellite.disqualified) {
        messages.push(`${satellite.url.replace(':7777', '')} | Node is disqualified`);
      } else if (satellite.suspended) {
        messages.push(`${satellite.url.replace(':7777', '')} | Node is suspended`);
      }

      return messages;
    });

    if (moment(stats.lastPinged).isBefore(moment().subtract(10, 'minute'))) {
      allMessages.push([`Last ping was ${moment.duration(moment(stats.lastPinged).diff()).humanize(true)}`]);
    }
    if (stats.quicEnabled === false) {
      allMessages.push(['QUIC is misconfigured']);
    }

    return allMessages.reduce((acc, curr) => acc.concat(curr), []);
  };

  ctrl.totalSpaceUsed = () => {
    return ctrl.nodes.reduce((acc, node) => acc + ((node.stats && node.stats.diskSpace && node.stats.diskSpace.used) || 0), 0);
  };
  ctrl.totalDiskUsageSpeed = () => {
    return ctrl.nodes.reduce((acc, node) => acc + (node.diskUsageSpeed || 0), 0);
  };
  ctrl.totalBandwidthUsed = () => {
    return ctrl.nodes.reduce((acc, node) => acc + ((node.stats && node.stats.bandwidth && node.stats.bandwidth.used) || 0), 0);
  };
  ctrl.totalIngress = () => {
    return ctrl.nodes.reduce((acc, node) => acc + ((node.stats && node.stats.ingressSummary) || 0), 0);
  };
  ctrl.totalIngressSpeed = () => {
    return ctrl.nodes.reduce((acc, node) => acc + (node.ingressSpeed || 0), 0);
  };
  ctrl.totalEgress = () => {
    return ctrl.nodes.reduce((acc, node) => acc + ((node.stats && node.stats.egressSummary) || 0), 0);
  };
  ctrl.totalEgressSpeed = () => {
    return ctrl.nodes.reduce((acc, node) => acc + (node.egressSpeed || 0), 0);
  };
  ctrl.totalEstimatedPayoutFiat = () => {
    return ctrl.nodes.reduce((acc, node) => acc + ((node.stats && node.stats.estimatedPayoutFiat) || 0), 0);
  };
}

angular.module('app').component('storj', {
  templateUrl: 'views/partials/components/miner/storj.html',
  controller: StorjController,
  bindings: {
    nodes: '<',
  }
});

