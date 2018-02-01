function BitbeanWalletController() {
  var ctrl = this;
}

angular.module('app').component('bitbeanWallet', {
  templateUrl: 'views/partials/components/wallets/bitbeanWallet.html',
  controller: BitbeanWalletController,
  bindings: {
    dashboards: '<',
  }
});

