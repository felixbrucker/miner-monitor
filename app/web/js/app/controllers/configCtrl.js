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
      groups:[],
      interval: null,
      layout:null,
      layouts:null,
      nicehashAddr:null
    };

    vm.localStorage={
      layout:null,
      refreshInterval:null
    };

    vm.waiting = null;
    vm.updating = null;
    vm.updatingMiner={};
    vm.updatingAgent={};

    vm.newDevice = {
      id: null,
      enabled: true,
      name: "",
      type: "",
      hostname: "",
      group:"",
      ohm:""
    };

    vm.newGroup = {
      id: null,
      enabled: true,
      name: ""
    };



    // controller API
    vm.init = init;
    vm.getConfig = getConfig;
    vm.setConfig = setConfig;
    vm.update = update;
    vm.addDevice = addDevice;
    vm.delDevice = delDevice;
    vm.addGroup=addGroup;
    vm.delGroup=delGroup;
    vm.getLocalStorage=getLocalStorage;
    vm.setLocalStorage=setLocalStorage;
    vm.updateMiner=updateMiner;
    vm.updateAgent=updateAgent;


    /**
     * @name updateAgent
     * @desc updates the agent from git
     * @memberOf configCtrl
     */
    function updateAgent(id) {
      vm.updatingAgent[id]=true;
      return $http({
        method: 'POST',
        url: 'api/config/updateAgent',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data:{id:id}
      }).then(function successCallback(response) {
        setTimeout(function(){vm.updatingAgent[id] = false;},500);
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
      vm.updatingMiner[id]=true;
      return $http({
        method: 'POST',
        url: 'api/config/updateMiner',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data:{id:id}
      }).then(function successCallback(response) {
        setTimeout(function(){vm.updatingMiner[id] = false;},500);
      }, function errorCallback(response) {
        console.log(response);
      });
    }

    /**
     * @name getLocalStorage
     * @desc get localstorage data
     * @memberOf configCtrl
     */
    function getLocalStorage(){
      vm.localStorage.layout=localStorage.getItem('layout');
      vm.localStorage.refreshInterval=parseInt(localStorage.getItem('refreshInterval'));
    }

    /**
     * @name setLocalStorage
     * @desc set localstorage data
     * @memberOf configCtrl
     */
    function setLocalStorage(){
      if(vm.localStorage.layout!==null)
        localStorage.setItem('layout', vm.localStorage.layout);
      else
        localStorage.removeItem('layout');
      if(vm.localStorage.refreshInterval!==null)
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
          group:"",
          ohm:""
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
     * @name addGroup
     * @desc add new group to array
     * @memberOf configCtrl
     */
    function addGroup() {
      if (vm.newGroup.name!==""&&vm.newGroup.name!==null){
        //gen unique id
        vm.newGroup.id=Date.now();
        //add to array
        vm.config.groups.push(JSON.parse(JSON.stringify(vm.newGroup)));
        //clear variables
        vm.newGroup={
          id:null,
          enabled:true,
          name:""
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
      vm.config.groups.forEach(function (entry,index,array) {
        if (entry.id===id){
          vm.config.groups.splice(index,1);
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
        vm.config.layout = response.data.layout;
        vm.config.layouts = response.data.layouts;
        vm.config.nicehashAddr = response.data.nicehashAddr;
        vm.config.devices = $filter('orderBy')(vm.config.devices, ['group','name']);
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
      vm.waiting = true;
      return $http({
        method: 'POST',
        url: 'api/config',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        },
        data: vm.config
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


    // call init function on firstload
    vm.init();

  }

})();
