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
    devices:[]
  },
  configNonPersistent:{
    types:[
      "baikal-miner",
      "miner-agent"
    ]
  },
  getConfig: function () {
    var obj=config.config;
    obj.types=config.configNonPersistent.types;
    return obj;
  },
  setConfig: function (newConfig) {
    delete newConfig.types;
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
