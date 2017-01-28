/**
 * @namespace statsCtrl
 *
 * @author: Felix Brucker
 * @version: v0.0.1
 *
 * @description
 * handles functionality for the stats page
 *
 */
(function () {
  'use strict';

  angular
    .module('app')
    .controller('statsCtrl', statsController);

  function statsController($scope, $interval, $http) {

    var vm = this;
    vm.statsInterval = null;
    vm.current = {
      entries:null,
      nicehash:null,
      bitcoinBalances:null,
      nanoPascal:null
    };
    vm.layout="";
    vm.enabled={};


    // controller API
    vm.init = init;
    vm.getStats = getStats;
    vm.getLayout = getLayout;


    /**
     * @name init
     * @desc data initialization function
     * @memberOf statsCtrl
     */
    function init() {
      angular.element(document).ready(function () {
        $("body").tooltip({ selector: '[data-toggle=tooltip]' });

        var layout=localStorage.getItem('layout');
        if (layout!==null&&layout!==""&&layout!=="NaN")
          vm.layout = layout;
        else
          vm.getLayout();

        var enabled=localStorage.getItem('enabled');
        if (enabled!==null&&enabled!==""&&enabled!=="NaN")
          vm.enabled = JSON.parse(enabled);
        else
          vm.enabled = {
            nh:true,
            nanoPascal:false
          };

        var interval=localStorage.getItem('refreshInterval');
        if (interval!==null&&interval!==""&&interval!=="NaN")
          vm.statsInterval = $interval(vm.getStats, parseInt(interval)*1000);
        else
          vm.statsInterval = $interval(vm.getStats, 5000);

        vm.getStats();
      });
    }

    /**
     * @name getStats
     * @desc get the stats
     * @memberOf statsCtrl
     */
    function getStats() {
      $http({
        method: 'GET',
        url: 'api/mining/stats'
      }).then(function successCallback(response) {
        vm.current.entries = response.data.entries;
        vm.current.nicehash = response.data.nicehash;
        vm.current.bitcoinBalances=response.data.bitcoinBalances;
        vm.current.nanoPascal=response.data.nanoPascal;
      }, function errorCallback(response) {
        console.log(response);
      });
    }

    /**
     * @name getStats
     * @desc get the stats
     * @memberOf statsCtrl
     */
    function getLayout() {
      $http({
        method: 'GET',
        url: 'api/config/layout'
      }).then(function successCallback(response) {
          vm.layout = response.data;
      }, function errorCallback(response) {
        console.log(response);
      });
    }


    $scope.$on('$destroy', function () {
      if (vm.statsInterval)
        $interval.cancel(vm.statsInterval);
    });

    // call init function on firstload
    vm.init();
  }

})();
