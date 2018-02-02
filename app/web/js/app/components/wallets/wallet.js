function WalletController() {
  var ctrl = this;
}

angular.module('app').component('wallet', {
  templateUrl: 'views/partials/components/wallets/wallet.html',
  controller: WalletController,
  bindings: {
    dashboards: '<',
  }
});

