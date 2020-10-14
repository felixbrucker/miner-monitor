function ChiaFarmerController() {
  var ctrl = this;

  ctrl.bestDLForChallenge = (challenge) => {
    if (challenge.estimates.length === 0) {
      return 'N/A';
    }
    const bestDL = challenge.estimates.reduce((bestDL, estimateInSec) => {
      if (bestDL === null) {
        return estimateInSec;
      }
      return bestDL < estimateInSec ? bestDL : estimateInSec;
    }, null);

    const duration = moment.duration(bestDL, 'seconds');
    if (duration.days() > 0) {
      return `${duration.days()}d ${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    }

    return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
  };

  ctrl.getConnectedHarvesterCount = () => {
    if (!ctrl.farmer.stats) {
      return 0;
    }

    return ctrl.farmer.stats.connections
      .filter(connection => connection.type === 2)
      .filter(connection => moment().diff(connection.last_message_time * 1e3, 'minutes') < 10)
      .length;
  };
}

angular.module('app').component('chiaFarmer', {
  templateUrl: 'views/partials/components/miner/chia-farmer.html',
  controller: ChiaFarmerController,
  bindings: {
    farmer: '<',
  }
});

