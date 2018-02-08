function StorjController($http) {
  var ctrl = this;
  ctrl.hidden = false;

  ctrl.toggleHidden = function() {
    ctrl.hidden = !ctrl.hidden;
  };

  ctrl.secondsSince = function(date) {
    return (Date.now() - date) / 1000;
  };

  ctrl.restartShare = function(id, nodeid) {
    return $http({
      method: 'POST',
      url: 'api/config/restartShares?node=' + nodeid,
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      },
      data: {id: id}
    }).then(function successCallback(response) {
    }, function errorCallback(response) {
      console.log(response);
    });
  };
}

angular.module('app').component('storj', {
  templateUrl: 'views/partials/components/miner/storj.html',
  controller: StorjController,
  bindings: {
    entry: '<',
  }
});

