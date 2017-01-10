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
      nicehash:null
    };
    vm.layout="";


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
        vm.getLayout();
        vm.getStats();
        vm.statsInterval = $interval(vm.getStats, 5000);
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
