function WalletController() {
  var ctrl = this;

  ctrl.isSynced = (data) => {
    return moment().diff(moment.unix(data.lastBlockReceived), 'minutes') < 30 && (data.syncProgress ? data.syncProgress >= 0.9997 : true) && !data.syncing;
  };

  ctrl.isSyncing = (data) => {
    return data.syncing || (data.syncProgress ? data.syncProgress < 0.9997 : false);
  };

  ctrl.isOutdated = (data) => {
    return moment().diff(moment.unix(data.lastBlockReceived), 'minutes') > 29;
  };

  ctrl.getLastBlockAgo = (data) => {
    return moment.unix(data.lastBlockReceived).fromNow();
  };

  ctrl.getNonEnabledNodes = (data) => {
    return data.nodes.filter(node => node.status !== 'ENABLED');
  };

  ctrl.isPledgeSufficient = (data) => {
    return (data.balance + (data.pledge || 0)) >= data.pledgeAmount;
  };

  ctrl.isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
  };

  ctrl.getFiatTotal = (key) => {
    return ctrl.dashboards
      .filter(dashboard => dashboard && dashboard.data)
      .map(dashboard => dashboard.data[key + 'Fiat'] ? dashboard.data[key + 'Fiat'] : 0)
      .reduce((acc, right) => acc + right, 0);
  };
}

angular.module('app').component('wallet', {
  templateUrl: 'views/partials/components/wallets/wallet.html',
  controller: WalletController,
  bindings: {
    dashboards: '<',
  }
});

