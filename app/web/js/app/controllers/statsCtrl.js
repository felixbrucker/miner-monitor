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
      dashboardData:null
    };
    vm.layout="";
    vm.enabled={};


    // controller API
    vm.init = init;
    vm.getStats = getStats;
    vm.getLayout = getLayout;
    vm.parseName = parseName;
    vm.atLeastOneBalanceDashboard=atLeastOneBalanceDashboard;
    vm.secondsSince = secondsSince;
    vm.isDashboardTypeEnabled = isDashboardTypeEnabled;
    vm.getTokenBalance = getTokenBalance;


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


        var interval=localStorage.getItem('refreshInterval');
        if (interval!==null&&interval!==""&&interval!=="NaN")
          vm.statsInterval = $interval(vm.getStats, parseInt(interval)*1000);
        else
          vm.statsInterval = $interval(vm.getStats, 5000);

        vm.getStats();
      });
    }

    function parseName(name){
      return (isNaN(name.charAt(0)) ? name : name.substr(1));
    }

    function atLeastOneBalanceDashboard(){
      if (vm.current.dashboardData) {
        for(var i=0;i<vm.current.dashboardData.length;i++){
          if(vm.current.dashboardData[i].enabled &&(
              vm.current.dashboardData[i].type==='bitcoinBalance' ||
              vm.current.dashboardData[i].type==='cryptoidBalance' ||
              vm.current.dashboardData[i].type==='counterpartyBalance' ||
              vm.current.dashboardData[i].type==='ethBalance' ||
              vm.current.dashboardData[i].type==='burstBalance'))
            return true;
        }
      }
      return false;
    }

    function getTokenBalance(token) {
      return (token.balance / (Math.pow(10, parseInt(token.tokenInfo.decimals))));
    }

    function isDashboardTypeEnabled(type) {
      for (let dashboard of vm.current.dashboardData) {
        if (dashboard.enabled && dashboard.type === type) {
          return true;
        }
      }
      return false;
    }

    function secondsSince(date) {
        return (Date.now() - date) / 1000;
    }

    /**
     * @name getStats
     * @desc get the stats
     * @memberOf statsCtrl
     */
    function getStats() {
      if (!window.document.hidden) {
        $http({
          method: 'GET',
          url: 'api/mining/stats'
        }).then(function successCallback(response) {
          vm.current.entries = response.data.entries;
          vm.current.dashboardData=response.data.dashboardData;
        }, function errorCallback(response) {
          console.log(response);
        });
      }
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
