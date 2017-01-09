'use strict';

var colors = require('colors/safe');
var fs = require('fs');

var configPath="data/settings.json";

if (!fs.existsSync("data")){
  fs.mkdirSync("data");
}
var config = module.exports = {
  config: {
    interval:null,
    devices:[],
    groups:[],
    layout:null
  },
  configNonPersistent:{
    types:[
      "baikal-miner",
      "miner-agent"
    ],
    layouts:["small","large"]
  },
  getConfig: function () {
    var obj=config.config;
    obj.types=config.configNonPersistent.types;
    obj.layouts=config.configNonPersistent.layouts;
    return obj;
  },
  setConfig: function (newConfig) {
    delete newConfig.types;
    delete newConfig.layouts;
    config.config = newConfig;
  },
  saveConfig: function () {
    console.log(colors.grey("writing config to file.."));
    fs.writeFile(configPath, JSON.stringify(config.config,null,2), function (err) {
      if (err) {
        return console.log(err);
      }
    });
  },
  loadConfig: function () {
    fs.stat(configPath, function (err, stat) {
      if (err == null) {
        fs.readFile(configPath, 'utf8', function (err, data) {
          if (err) throw err;
          config.config = JSON.parse(data);
          if(config.config.groups===undefined)
            config.config.groups=[];
          if(config.config.layout===undefined)
            config.config.layout="small";
        });
      } else if (err.code == 'ENOENT') {
        //default conf
        config.config.interval=10;
        config.saveConfig();
        setTimeout(function(){
          config.loadConfig();
        },500);
      }
    });
  }
};
console.log("initializing, please wait...");
config.loadConfig();
