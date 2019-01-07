function BurstProxyController() {
    const ctrl = this;

    ctrl.getTimeElapsedSinceLastBlock = (blockStart) => {
      const duration = moment.duration(moment().diff(moment(blockStart)));

      return `${duration.hours().toString().padStart(2, '0')}:${duration.minutes().toString().padStart(2, '0')}:${duration.seconds().toString().padStart(2, '0')}`;
    };

    ctrl.getBestDeadlineString = (bestDL) => {
      if (!bestDL) {
        return 'N/A';
      }
      const duration = moment.duration(parseInt(bestDL, 10), 'seconds');
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

    ctrl.getRewardsPerDayString = (upstream) => {
      let result = upstream.rewardsPerDay === undefined ? 'N/A' : `~ ${upstream.rewardsPerDay.toFixed(2)}`;
      result += ` ${upstream.isBHD ? 'BHD' : 'Burst'} per day`;

      return result;
    }
}

angular.module('app').component('burstProxy', {
    templateUrl: 'views/partials/components/miner/burstProxy.html',
    controller: BurstProxyController,
    bindings: {
        upstreams: '<',
    }
});

