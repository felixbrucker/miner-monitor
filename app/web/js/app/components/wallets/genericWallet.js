function GenericWalletController() {
  var ctrl = this;
}

angular.module('app').component('genericWallet', {
  templateUrl: 'views/partials/components/wallets/genericWallet.html',
  controller: GenericWalletController,
  bindings: {
    dashboards: '<',
  }
});

