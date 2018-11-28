function CreepMinerController() {
    const ctrl = this;

    ctrl.getTimeElapsedSinceLastBlock = (blockStart) => {
      const duration = moment.duration(moment().diff(moment.unix(blockStart)));

      return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    };

    ctrl.getBestDeadlineString = (bestDL) => {
      if (!bestDL) {
        return 'N/A';
      }
      const duration = moment.duration(bestDL, 'seconds');
      if (duration.months() > 0) {
        return `${duration.months()}m ${duration.days()}d ${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
      } else if (duration.days() > 0) {
        return `${duration.days()}d ${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
      }

      return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    };

    ctrl.getTimeTillFoundBlock = (timeToFindBlockInSeconds) => {
      return moment.duration(timeToFindBlockInSeconds, 'seconds').humanize().replace('a ', '');
    };
}

angular.module('app').component('creepMiner', {
    templateUrl: 'views/partials/components/miner/creepMiner.html',
    controller: CreepMinerController,
    bindings: {
        entries: '<',
    }
});

