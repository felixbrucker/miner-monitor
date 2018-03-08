function WalletController() {
  var ctrl = this;

  ctrl.isSynced = (data) => {
    return moment().diff(moment.unix(data.lastBlockReceived), 'minutes') < 30 && (data.syncProgress ? data.syncProgress >= 0.9999 : true);
  };

  ctrl.isSyncing = (data) => {
    return (data.syncProgress ? data.syncProgress < 0.9999 : false);
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
}

angular.module('app').component('wallet', {
  templateUrl: 'views/partials/components/wallets/wallet.html',
  controller: WalletController,
  bindings: {
    dashboards: '<',
  }
});

