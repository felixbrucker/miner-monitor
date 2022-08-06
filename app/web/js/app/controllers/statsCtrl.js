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
      dashboardData:null,
    };
    vm.balances = {
      bitcoin: [],
      burst: [],
      cryptoid: [],
      counterparty: [],
      ethereum: [],
      nicehash: [],
      coinbase: [],
    };
    vm.custom = {
      dashboardApi: [],
      colabManagerStatsCollections: [],
    };
    vm.dashboards = {
      nicehash: [],
      mpos: [],
      mph: [],
      nodeCryptonotePools: [],
      wallets: [],
      yiimp: [],
      hdpool: [],
      balances: [],
    };
    vm.devices = [];
    vm.creepMiner = [];
    vm.enabled={};
    vm.hidden={};
    vm.storjNodes = [];
    vm.chiaPlotterPlotJobs = [];
    vm.rclones = [];


    // controller API
    vm.init = init;
    vm.getStats = getStats;
    vm.atLeastOneBalanceDashboard=atLeastOneBalanceDashboard;
    vm.secondsSince = secondsSince;
    vm.isDashboardTypeEnabled = isDashboardTypeEnabled;
    vm.isDashboardTypesEnabled = isDashboardTypesEnabled;
    vm.isDeviceTypeEnabled = isDeviceTypeEnabled;

    /**
     * @name init
     * @desc data initialization function
     * @memberOf statsCtrl
     */
    function init() {
      angular.element(document).ready(function () {
        // doesn't automatically render the updated content, use standard tooltips for now
        // $("body").tooltip({ selector: '[data-toggle=tooltip]' });

        var interval=localStorage.getItem('refreshInterval');
        if (interval!==null&&interval!==""&&interval!=="NaN")
          vm.statsInterval = $interval(vm.getStats, parseInt(interval)*1000);
        else
          vm.statsInterval = $interval(vm.getStats, 5000);

        vm.getStats();
      });
    }

    function atLeastOneBalanceDashboard(){
      if (vm.current.dashboardData) {
        for(var i=0;i<vm.current.dashboardData.length;i++){
          if(vm.current.dashboardData[i].enabled &&(
              vm.current.dashboardData[i].type==='bitcoinBalance' ||
              vm.current.dashboardData[i].type==='cryptoidBalance' ||
              vm.current.dashboardData[i].type==='counterpartyBalance' ||
              vm.current.dashboardData[i].type==='ethBalance'))
            return true;
        }
      }
      return false;
    }

    function isDashboardTypeEnabled(type) {
      if (vm.current.dashboardData) {
        for (let dashboard of vm.current.dashboardData) {
          if (dashboard.enabled && dashboard.type === type) {
            return true;
          }
        }
      }

      return false;
    }

    function isDashboardTypesEnabled(types) {
      if (vm.current.dashboardData) {
        for (let dashboard of vm.current.dashboardData) {
          if (dashboard.enabled && types.indexOf(dashboard.type) !== -1) {
            return true;
          }
        }
      }

      return false;
    }

    function isDeviceTypeEnabled(type) {
      if (!vm.devices) {
        return false;
      }
      return vm.devices.some(device => device.type === type);
    }

    function getDashboardArrForTypes(types) {
      return vm.current.dashboardData ? vm.current.dashboardData
          .filter(dashboard => types.indexOf(dashboard.type) !== -1 && dashboard.enabled)
        : [];
    }

    function getDeviceArrForTypes(types) {
      return vm.devices ? vm.devices
          .filter(device => types.indexOf(device.type) !== -1)
        : [];
    }

    function secondsSince(date) {
        return (Date.now() - date) / 1000;
    }

    function sortByName(a, b) {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    }

    function updateArrays() {
      vm.balances.bitcoin = getDashboardArrForTypes(['bitcoinBalance']);
      vm.balances.cryptoid = getDashboardArrForTypes(['cryptoidBalance']);
      vm.balances.counterparty = getDashboardArrForTypes(['counterpartyBalance']);
      vm.balances.ethereum = getDashboardArrForTypes(['ethBalance']);
      vm.balances.bitmart = getDashboardArrForTypes(['bitmart-balance']);
      vm.balances.nicehash = getDashboardArrForTypes(['nicehashBalance']);
      vm.balances.coinbase = getDashboardArrForTypes(['coinbase']);
      vm.custom.dashboardApi = getDashboardArrForTypes(['dashboard-api']);
      vm.custom.colabManagerStatsCollections = getDashboardArrForTypes(['colab-manager-stats-collection']);
      vm.dashboards.nicehash = getDashboardArrForTypes(['nicehash']);
      vm.dashboards.mpos = getDashboardArrForTypes(['genericMPOS']);
      vm.dashboards.mph = getDashboardArrForTypes(['miningpoolhub']);
      vm.dashboards.nodeCryptonotePools = getDashboardArrForTypes(['node-cryptonote-pool', 'snipa-nodejs-pool']);
      vm.dashboards.wallets = getDashboardArrForTypes(['generic-wallet', 'bitbean-wallet', 'bhd-wallet', 'disc-wallet', 'burst-wallet', 'boom-wallet', 'chia-wallet']);
      var walletAgents = getDashboardArrForTypes(['wallet-agent']);
      walletAgents.map(walletAgent => {
        vm.dashboards.wallets = vm.dashboards.wallets.concat(walletAgent.data);
      });
      vm.dashboards.yiimp = getDashboardArrForTypes('yiimp');
      vm.dashboards.hdpool = getDashboardArrForTypes('hdpool');
      vm.dashboards.hdpoolControl = getDashboardArrForTypes('hdpool-control');
      vm.dashboards.hpool = getDashboardArrForTypes('hpool');
      vm.dashboards.foxyPools = getDashboardArrForTypes(['foxy-pool', 'foxy-pool-v2']);

      const ethAndTokenBalances = vm.balances.ethereum
        .reduce((acc, dashboard) => {
          const addressUrl = `https://etherscan.io/address/${dashboard.addr}`;
          if (dashboard.data.eth === undefined) {
            return acc;
          }

          return acc.concat([{
            addressUrl,
            name: dashboard.name,
            ticker: 'ETH',
            data: {
              balance: dashboard.data.eth.balance,
              balanceFiat: dashboard.data.eth.balanceFiat,
            },
          }].concat(dashboard.data.tokens.map(token => {
            return {
              addressUrl,
              name: dashboard.name,
              ticker: token.tokenInfo.symbol,
              data: {
                balance: token.balance,
                balanceFiat: token.balanceFiat,
              },
            };
          })));
        }, []);
      const coinbaseBalances = vm.balances.coinbase
        .reduce((acc, dashboard) => {
          return acc.concat(dashboard.data.map(({ balance, balanceFiat, ticker }) => {
            return {
              name: dashboard.name,
              ticker,
              data: {
                balance,
                balanceFiat,
              },
            };
          }));
        }, []);
      const allBalances = ethAndTokenBalances.concat(coinbaseBalances).concat(getDashboardArrForTypes(['all-the-blocks-balance', 'signum-balance', 'bhd-balance']));
      const groupedBalanceDashboards = {};
      vm.dashboards.balances = allBalances.reduce((acc, curr) => {
        if (!groupedBalanceDashboards[curr.ticker]) {
          groupedBalanceDashboards[curr.ticker] = {
            ticker: curr.ticker,
            balances: [],
          };
          acc.push(groupedBalanceDashboards[curr.ticker]);
        }
        groupedBalanceDashboards[curr.ticker].balances.push(curr);

        return acc;
      }, []);

      vm.devices = vm.current.entries
        .sort(sortByName)
        .map(group => Object.keys(group.devices)
            .map(key => group.devices[key])
            .sort(sortByName)
        )
        .reduce((acc, curr) => acc.concat(curr), []);
      vm.creepMiner = getDeviceArrForTypes(['creep-miner']);
      vm.burstProxies = getDeviceArrForTypes(['burst-proxy']).reduce((acc, curr) => {
        const stats = curr.stats.reduce((upstreamStats , proxy) => upstreamStats.concat(proxy.upstreamStats), []);
        return acc.concat(...stats);
      }, []);
      vm.storjNodes = getDeviceArrForTypes(['storj']);
      vm.chiaPlotterPlotJobs = getDeviceArrForTypes(['chia-plotter']).reduce((acc, curr) => {
        if (curr.stats) {
          return acc.concat(...curr.stats);
        }

        return acc;
      }, []).sort((a, b) => {
        if (a.avgPlotTimeInSeconds === null && b.avgPlotTimeInSeconds === null) {
          return 0;
        }
        if (a.avgPlotTimeInSeconds === null) {
          return 1;
        }
        if (b.avgPlotTimeInSeconds === null) {
          return -1;
        }
        const elapsedTimeInSecondsA = moment().diff(moment(a.startedAt), 'seconds');
        const etaInSecondsA = Math.max(a.avgPlotTimeInSeconds - elapsedTimeInSecondsA, 0);
        const elapsedTimeInSecondsB = moment().diff(moment(b.startedAt), 'seconds');
        const etaInSecondsB = Math.max(b.avgPlotTimeInSeconds - elapsedTimeInSecondsB, 0);

        return etaInSecondsA - etaInSecondsB;
      });
      vm.chiaMiners = getDeviceArrForTypes(['chia-miner']);
      vm.rclones = getDeviceArrForTypes(['rclone']);
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
          updateArrays();
          $("body").tooltip({ selector: '[data-toggle=tooltip]' });
        }, function errorCallback(response) {
          console.log(response);
        });
      }
    }

    $scope.$on('$destroy', function () {
      if (vm.statsInterval)
        $interval.cancel(vm.statsInterval);
    });

    // call init function on firstload
    vm.init();
  }

})();
