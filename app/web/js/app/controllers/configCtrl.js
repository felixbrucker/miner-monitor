/**
 * @namespace configCtrl
 *
 * @author: Felix Brucker
 * @version: v0.0.1
 *
 * @description
 * handles functionality for the config page
 *
 */
(function () {
  'use strict';

  angular
    .module('app')
    .controller('configCtrl', configController);

  function configController($scope, $interval, $http, $filter) {

    var vm = this;
    vm.config = {
      types: [],
      devices: [],
      groups: [],
      interval: null,
      dashboardData: [],
      dashboardTypes: null,
      mailConfig: null,
      mailTo: null
    };

    vm.localStorage = {
      enabled: null,
      refreshInterval: null
    };

    vm.waiting = null;
    vm.updating = null;
    vm.waitingVerify = null;
    vm.verifySuccess = null;
    vm.updatingMiner = {};
    vm.updatingAgent = {};

    vm.newDevice = {
      id: null,
      enabled: true,
      name: "",
      type: "",
      hostname: "",
      group: null,
    };

    vm.newGroup = {
      id: null,
      enabled: true,
      name: "",
      display: true,
      interval: null,
    };

    vm.newDashboard = {
      id: null,
      enabled: true,
      name: "",
      type: "",
      baseUrl: "",
      address: "",
      ticker: "",
      api_key: "",
      user_id: "",
      hrModifier: 1
    };


    // controller API
    vm.init = init;
    vm.getConfig = getConfig;
    vm.setConfig = setConfig;
    vm.update = update;
    vm.addDevice = addDevice;
    vm.delDevice = delDevice;
    vm.copyDevice = copyDevice;
    vm.addGroup = addGroup;
    vm.delGroup = delGroup;
    vm.getLocalStorage = getLocalStorage;
    vm.setLocalStorage = setLocalStorage;
    vm.updateMiner = updateMiner;
    vm.updateAgent = updateAgent;
    vm.verifyTransport = verifyTransport;
    vm.rebootSystem = rebootSystem;
    vm.addDashboard = addDashboard;
    vm.delDashboard = delDashboard;
    vm.getDashboardTypes = getDashboardTypes;
    vm.restartShares = restartShares;


    function getDashboardTypes(column) {
      const types = [];
      switch (column) {
        case 'address':
          types.push('nicehash', 'bitcoinBalance', 'cryptoidBalance', 'counterpartyBalance', 'ethBalance', 'signum-balance', 'node-cryptonote-pool', 'snipa-nodejs-pool', 'yiimp', 'hdpool', 'hpool', 'burst-wallet', 'boom-wallet', 'foxy-pool', 'foxy-pool-v2', 'all-the-blocks-balance', 'bhd-balance');
          break;
        case 'ticker':
          types.push('cryptoidBalance', 'snipa-nodejs-pool', 'generic-wallet', 'foxy-pool', 'foxy-pool-v2', 'all-the-blocks-balance');
          break;
        case 'baseUrl':
          types.push('genericMPOS', 'dashboard-api', 'colab-manager-stats-collection', 'node-cryptonote-pool', 'snipa-nodejs-pool', 'generic-wallet', 'bitbean-wallet', 'bhd-wallet', 'disc-wallet', 'burst-wallet', 'boom-wallet', 'yiimp', 'wallet-agent', 'hdpool-control', 'chia-wallet');
          break;
        case 'apiKey':
          types.push('genericMPOS', 'miningpoolhub', 'cryptoidBalance', 'nicehashBalance', 'coinbase', 'hdpool', 'bitmart-balance', 'hpool', 'nicehash', 'chia-wallet', 'all-the-blocks-balance');
          break;
        case 'userId':
          types.push('genericMPOS', 'miningpoolhub', 'nicehashBalance', 'hdpool', 'hpool', 'nicehash');
          break;
        case 'hashrateModifier':
          types.push('genericMPOS', 'snipa-nodejs-pool', 'all-the-blocks-balance');
          break;
      }
      return types;
    }

    /**
     * @name verifyTransport
     * @desc verifies the mail transport
     * @memberOf configCtrl
     */
    function verifyTransport() {
      vm.waitingVerify = true;
      return $http({
        method: 'GET',
        url: 'api/config/verifyTransport',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }).then(function successCallback(response) {
        setTimeout(function () {
          vm.waitingVerify = false;
        }, 500);
        vm.verifySuccess = response.data.result;
      }, function errorCallback(response) {
        console.log(response);
      });
    }

    /**
     * @name updateAgent
     * @desc updates the agent from git
     * @memberOf configCtrl
     */
    function updateAgent(id) {
      vm.updatingAgent[id] = true;
      return $http({
        method: 'POST',
        url: 'api/config/updateAgent',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data: {id: id}
      }).then(function successCallback(response) {
        setTimeout(function () {
          vm.updatingAgent[id] = false;
        }, 500);
      }, function errorCallback(response) {
        console.log(response);
      });
    }

    /**
     * @name updateMiner
     * @desc updates the miner from git
     * @memberOf configCtrl
     */
    function updateMiner(id) {
      vm.updatingMiner[id] = true;
      return $http({
        method: 'POST',
        url: 'api/config/updateMiner',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data: {id: id}
      }).then(function successCallback(response) {
        setTimeout(function () {
          vm.updatingMiner[id] = false;
        }, 500);
      }, function errorCallback(response) {
        console.log(response);
      });
    }

    /**
     * @name getLocalStorage
     * @desc get localstorage data
     * @memberOf configCtrl
     */
    function getLocalStorage() {
      vm.localStorage.refreshInterval = parseInt(localStorage.getItem('refreshInterval'));
    }

    /**
     * @name setLocalStorage
     * @desc set localstorage data
     * @memberOf configCtrl
     */
    function setLocalStorage() {
      if (vm.localStorage.refreshInterval !== null)
        localStorage.setItem('refreshInterval', vm.localStorage.refreshInterval.toString());
      else
        localStorage.removeItem('refreshInterval');
    }

    /**
     * @name init
     * @desc data initialization function
     * @memberOf configCtrl
     */
    function init() {
      angular.element(document).ready(function () {
        vm.getConfig();
        vm.getLocalStorage();
      });
    }


    /**
     * @name addDevice
     * @desc add new device to array
     * @memberOf configCtrl
     */
    function addDevice() {
      if (vm.newDevice.name !== "" && vm.newDevice.hostname !== "" && vm.newDevice.type !== "") {
        //gen unique id
        vm.newDevice.id = Date.now();
        //replace / if exists at the end of the hostname
        vm.newDevice.hostname = vm.newDevice.hostname.replace(/\/$/, "");
        //add to array
        vm.config.devices.push(JSON.parse(JSON.stringify(vm.newDevice)));
        //clear variables
        vm.newDevice = {
          id: null,
          enabled: true,
          name: "",
          type: "",
          hostname: "",
          group: null,
        };
        vm.setConfig();
      } else {
        return false;
      }
    }

    /**
     * @name delDevice
     * @desc delete device from array
     * @memberOf configCtrl
     */
    function delDevice(id) {
      vm.config.devices.forEach(function (entry, index, array) {
        if (entry.id === id) {
          vm.config.devices.splice(index, 1);
        }
      });
      vm.setConfig();
    }

    /**
     * @name copyDevice
     * @desc copy device data
     * @memberOf configCtrl
     */
    function copyDevice(id) {
      vm.config.devices.forEach(function (entry, index, array) {
        if (entry.id === id) {
          vm.newDevice.enabled = entry.enabled;
          vm.newDevice.name = entry.name;
          vm.newDevice.type = entry.type;
          vm.newDevice.hostname = entry.hostname;
          vm.newDevice.group = entry.group;
        }
      });
    }

    /**
     * @name addDashboard
     * @desc add new dashboard to array
     * @memberOf configCtrl
     */
    function addDashboard() {
      if (vm.newDashboard.name !== "" && vm.newDashboard.type !== "") {
        //gen unique id
        vm.newDashboard.id = Date.now();
        //replace / if exists at the end of the hostname
        vm.newDashboard.baseUrl = vm.newDashboard.baseUrl.replace(/\/$/, "");
        //add to array
        vm.config.dashboardData.push(JSON.parse(JSON.stringify(vm.newDashboard)));
        //clear variables
        vm.newDashboard = {
          id: null,
          enabled: true,
          name: "",
          type: "",
          baseUrl: "",
          address: "",
          ticker: "",
          api_key: "",
          user_id: "",
          hrModifier: 1
        };
        vm.setConfig();
      } else {
        return false;
      }
    }

    /**
     * @name delDashboard
     * @desc delete dashboard from array
     * @memberOf configCtrl
     */
    function delDashboard(id) {
      vm.config.dashboardData.forEach(function (entry, index, array) {
        if (entry.id === id) {
          vm.config.dashboardData.splice(index, 1);
        }
      });
      vm.setConfig();
    }

    /**
     * @name addGroup
     * @desc add new group to array
     * @memberOf configCtrl
     */
    function addGroup() {
      if (vm.newGroup.name !== "" && vm.newGroup.name !== null) {
        //gen unique id
        vm.newGroup.id = Date.now();
        //add to array
        vm.config.groups.push(JSON.parse(JSON.stringify(vm.newGroup)));
        //clear variables
        vm.newGroup = {
          id: null,
          enabled: true,
          name: "",
          display: true,
          interval: null,
        };
        vm.setConfig();
      }
    }


    /**
     * @name delGroup
     * @desc delete group from array
     * @memberOf configCtrl
     */
    function delGroup(id) {
      vm.config.groups.forEach(function (entry, index, array) {
        if (entry.id === id) {
          vm.config.groups.splice(index, 1);
        }
      });
      vm.setConfig();
    }


    /**
     * @name getConfig
     * @desc get the config
     * @memberOf configCtrl
     */
    function getConfig() {
      return $http({
        method: 'GET',
        url: 'api/config'
      }).then(function successCallback(response) {
        vm.config.types = response.data.types;
        vm.config.devices = response.data.devices;
        vm.config.groups = response.data.groups;
        vm.config.interval = response.data.interval;
        vm.config.dashboardData = response.data.dashboardData;
        vm.config.dashboardTypes = response.data.dashboardTypes;
        if (response.data.mailConfig === null)
          vm.config.mailConfig = {host: null, port: null, secure: null, auth: {user: null, pass: null}};
        else
          vm.config.mailConfig = response.data.mailConfig;
        vm.config.mailTo = response.data.mailTo;
        vm.config.devices = $filter('orderBy')(vm.config.devices, ['group', 'name']);
        vm.config.groups = $filter('orderBy')(vm.config.groups, 'name');
      }, function errorCallback(response) {
        console.log(response);
      });
    }


    /**
     * @name setConfig
     * @desc set the config
     * @memberOf configCtrl
     */
    function setConfig() {
      var config = JSON.parse(JSON.stringify(vm.config));
      if (vm.config.mailConfig === {host: null, port: null, secure: null, auth: {user: null, pass: null}}) {
        config.mailConfig = null;
      }
      vm.waiting = true;
      return $http({
        method: 'POST',
        url: 'api/config',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data: config
      }).then(function successCallback(response) {
        setTimeout(function () {
          vm.waiting = false;
        }, 500);
      }, function errorCallback(response) {
        console.log(response);
      });
    }


    /**
     * @name update
     * @desc updates the project from git
     * @memberOf configCtrl
     */
    function update() {
      vm.updating = true;
      return $http({
        method: 'POST',
        url: 'api/config/update',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }).then(function successCallback(response) {
        setTimeout(function () {
          vm.updating = false;
        }, 500);
      }, function errorCallback(response) {
        console.log(response);
      });
    }

    /**
     * @name rebootSystem
     * @desc reboots the system if confirmed
     * @memberOf configCtrl
     */
    function rebootSystem(id) {
      if (confirm('Are you sure you want to reboot this System?')) {
        return $http({
          method: 'POST',
          url: 'api/config/rebootSystem',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8'
          },
          data: {id: id}
        }).then(function successCallback(response) {
        }, function errorCallback(response) {
          console.log(response);
        });
      }
    }

    /**
     * @name restartShares
     * @desc restarts all shares if confirmed
     * @memberOf configCtrl
     */
    function restartShares(id) {
      if (confirm('Are you sure you want to restart all shares of this system?')) {
        return $http({
          method: 'POST',
          url: 'api/config/restartShares?node=all',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8'
          },
          data: {id: id}
        }).then(function successCallback(response) {
        }, function errorCallback(response) {
          console.log(response);
        });
      }
    }


    // call init function on firstload
    vm.init();

  }

})();
