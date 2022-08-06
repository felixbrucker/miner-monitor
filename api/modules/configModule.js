'use strict';

const colors = require('colors/safe');
const fs = require('fs');

const configPath='data/settings.json';

if (!fs.existsSync('data')){
  fs.mkdirSync('data');
}
const config = module.exports = {
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
      'creep-miner',
      'burst-proxy',
      'storj',
      'chia-plotter',
      'chia-miner',
      'chia-farmer',
      'chia-archiver',
      'rclone',
    ],
    dashboardTypes:[
      'bitcoinBalance',
      'bitmart-balance',
      'signum-balance',
      'counterpartyBalance',
      'cryptoidBalance',
      'dashboard-api',
      'colab-manager-stats-collection',
      'ethBalance',
      'genericMPOS',
      'hdpool',
      'hdpool-control',
      'hpool',
      'miningpoolhub',
      'foxy-pool',
      'foxy-pool-v2',
      'nicehash',
      'nicehashBalance',
      'node-cryptonote-pool',
      'snipa-nodejs-pool',
      'generic-wallet',
      'bitbean-wallet',
      'bhd-wallet',
      'disc-wallet',
      'burst-wallet',
      'boom-wallet',
      'chia-wallet',
      'wallet-agent',
      'coinbase',
      'yiimp',
      'all-the-blocks-balance',
      'bhd-balance',
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
        return console.error(err);
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
