'use strict';

var colors = require('colors/safe');
var fs = require('fs');

var configPath='data/settings.json';

if (!fs.existsSync('data')){
  fs.mkdirSync('data');
}
var config = module.exports = {
  config: {
    interval:null,
    devices:[],
    groups:[],
    mailConfig:null,
    mailTo:null,
    dashboardData:[]
  },
  configNonPersistent:{
    types:[
      'miner-agent',
      'storj',
    ],
    dashboardTypes:[
      'bitcoinBalance',
      'burstBalance',
      'counterpartyBalance',
      'cryptoidBalance',
      'dashboard-api',
      'ethBalance',
      'genericMPOS',
      'miningpoolhub',
      'nicehash',
      'nicehashBalance',
      'node-cryptonote-pool',
      'snipa-nodejs-pool',
      'generic-wallet',
      'bitbean-wallet',
    ]
  },
  getConfig: function () {
    const obj=config.config;
    obj.types=config.configNonPersistent.types;
    obj.layouts=config.configNonPersistent.layouts;
    obj.dashboardTypes=config.configNonPersistent.dashboardTypes;
    return obj;
  },
  setConfig: function (newConfig) {
    delete newConfig.types;
    delete newConfig.layouts;
    delete newConfig.dashboardTypes;
    config.config = newConfig;
  },
  saveConfig: function () {
    console.log(colors.grey('writing config to file..'));
    fs.writeFile(configPath, JSON.stringify(config.config,null,2), function (err) {
      if (err) {
        return console.log(err);
      }
    });
  },
  loadConfig: function () {
    fs.stat(configPath, function (err, stat) {
      if (err === null) {
        fs.readFile(configPath, 'utf8', function (err, data) {
          if (err) throw err;
          config.config = JSON.parse(data);
          if(config.config.groups===undefined)
            config.config.groups=[];
          if(config.config.dashboardData===undefined)
            config.config.dashboardData=[];
          if(config.config.mailConfig===undefined)
            config.config.mailConfig=null;
          // migrations
          config.config.devices
            .filter(device => typeof device.group === 'string')
            .map((device) => {
              const group = config.config.groups.find(group => group.name === device.group);
              if (group) {
                device.group = group.id;
              }
            });
          config.saveConfig();
        });
      } else if (err.code === 'ENOENT') {
        //default conf
        config.config.interval=30;
        config.config.dashboardData=[];
        config.saveConfig();
        setTimeout(function(){
          config.loadConfig();
        },500);
      }
    });
  }
};
console.log('initializing, please wait...');
config.loadConfig();
