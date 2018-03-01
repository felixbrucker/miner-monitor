function WalletController() {
  var ctrl = this;

  ctrl.isSynced = (data) => {
    return moment().diff(moment.unix(data.lastBlockReceived), 'minutes') < 30 && (data.syncProgress ? data.syncProgress >= 1 : true);
  };

  ctrl.isSyncing = (data) => {
    return (data.syncProgress ? data.syncProgress < 1 : false);
  };

  ctrl.isOutdated = (data) => {
    return moment().diff(moment.unix(data.lastBlockReceived), 'minutes') > 29;
  };

  ctrl.getLastBlockAgo = (data) => {
    return moment.unix(data.lastBlockReceived).fromNow();
  };
}

angular.module('app').component('wallet', {
  templateUrl: 'views/partials/components/wallets/wallet.html',
  controller: WalletController,
  bindings: {
    dashboards: '<',
  }
});

