function NodeCryptonotePoolsController() {
  var ctrl = this;

  ctrl.parseName = function(name) {
    return (isNaN(name.charAt(0)) ? name : name.substr(1));
  };

  ctrl.getNodeCryptonotePoolFiatTotal = function(key) {
    return ctrl.dashboards
      .map(dashboard => dashboard.data[key + 'Fiat'] ? dashboard.data[key + 'Fiat'] : 0)
      .reduce((acc, right) => acc + right, 0);
  };

  ctrl.stripNodeCryptonotePoolUrl = function(url) {
    var arr = url.split(':');
    if (arr.length === 3) {
      arr.splice(2, 1);
    }
    arr[1] = arr[1].replace('/api', '');
    return arr.join(':');
  };
}

angular.module('app').component('nodeCryptonotePools', {
  templateUrl: 'views/partials/components/pools/nodeCryptonotePools.html',
  controller: NodeCryptonotePoolsController,
  bindings: {
    dashboards: '<',
  }
});

