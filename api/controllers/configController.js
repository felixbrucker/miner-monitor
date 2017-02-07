'use strict';

const https = require('https');
const http = require('http');
var colors = require('colors/safe');


var configModule = require(__basedir + 'api/modules/configModule');
var statsController = require(__basedir + 'api/controllers/statsController');
var mailController = require(__basedir + 'api/controllers/mailController');

Array.prototype.contains = function (element) {
  return this.indexOf(element) > -1;
};

function getLayout(req, res, next){
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(configModule.getConfig().layout));
}

function getConfig(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(configModule.getConfig()));
}
function setConfig(req, res, next) {
  statsController.cleanup();
  var prev=JSON.parse(JSON.stringify(configModule.config.interval));
  configModule.setConfig(req.body);
  if (prev!==req.body.interval)
    statsController.restartInterval();
  configModule.saveConfig();
  mailController.reloadTransport();
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: true}));
}

function update(req, res, next) {
  const spawn = require('cross-spawn');
  var isWin = /^win/.test(process.platform);
  if (isWin){
    const child = spawn('helpers\\update.bat', [], {
      detached: true,
      stdio: 'ignore',
      shell: true
    });
  }else{
    const child = spawn('helpers/update.sh', [], {
      detached: true,
      stdio: 'ignore',
      shell: true
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: true}));
}

function updateMiner(req, res, next) {
  var id=req.body.id;
  for(var j=0;j<configModule.config.devices.length;j++) {
    var device = configModule.config.devices[j];
    if (device.id===id){
      if(device.type!=='baikal-miner'){
        var arr = device.hostname.split("://");
        var protocol=arr[0];
        arr = arr[1].split(":");
        var path="/api/config/updateMiner";
        switch(protocol) {
          case "http":
            var req = http.request({
              host: arr[0],
              path: path,
              method: 'POST',
              port: arr[1],
              headers: {
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }, function (response) {
              response.setEncoding('utf8');
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function () {
                var parsed = null;
                try {
                  parsed = JSON.parse(body);
                } catch (error) {
                  console.log(colors.red("[" + device.name + "] Error: Unable to update miner"));
                }
                if (parsed != null&&parsed.result) {
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: true}));
                }else{
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: false}));
                }
              });
            }).on("error", function (error) {
              console.log(colors.red("[" + device.name + "] Error: Unable to update miner"));
              console.log(error);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({result: false}));
            });
            req.end();
            break;
          case "https":
            var req = https.request({
              host: arr[0],
              path: path,
              method: 'POST',
              port: arr[1],
              rejectUnauthorized: false,
              headers: {
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }, function (response) {
              response.setEncoding('utf8');
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function () {
                var parsed = null;
                try {
                  parsed = JSON.parse(body);
                } catch (error) {
                  console.log(colors.red("[" + device.name + "] Error: Unable to update miner"));
                }
                if (parsed != null&&parsed.result) {
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: true}));
                }else{
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: false}));
                }
              });
            }).on("error", function (error) {
              console.log(colors.red("[" + device.name + "] Error: Unable to update miner"));
              console.log(error);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({result: false}));
            });
            req.end();
            break;
        }
      }else{
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({result: false}));
      }
      break;
    }
  }
}

function updateAgent(req, res, next) {
  var id=req.body.id;
  for(var j=0;j<configModule.config.devices.length;j++) {
    var device = configModule.config.devices[j];
    if (device.id===id){
      if(device.type!=='baikal-miner'){
        var arr = device.hostname.split("://");
        var protocol=arr[0];
        arr = arr[1].split(":");
        var path="/api/config/update";
        switch(protocol) {
          case "http":
            var req = http.request({
              host: arr[0],
              path: path,
              method: 'POST',
              port: arr[1],
              headers: {
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }, function (response) {
              response.setEncoding('utf8');
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function () {
                var parsed = null;
                try {
                  parsed = JSON.parse(body);
                } catch (error) {
                  console.log(colors.red("[" + device.name + "] Error: Unable to update agent"));
                }
                if (parsed != null&&parsed.result) {
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: true}));
                }else{
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: false}));
                }
              });
            }).on("error", function (error) {
              console.log(colors.red("[" + device.name + "] Error: Unable to update agent"));
              console.log(error);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({result: false}));
            });
            req.end();
            break;
          case "https":
            var req = https.request({
              host: arr[0],
              path: path,
              method: 'POST',
              port: arr[1],
              rejectUnauthorized: false,
              headers: {
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }, function (response) {
              response.setEncoding('utf8');
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function () {
                var parsed = null;
                try {
                  parsed = JSON.parse(body);
                } catch (error) {
                  console.log(colors.red("[" + device.name + "] Error: Unable to update agent"));
                }
                if (parsed != null&&parsed.result) {
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: true}));
                }else{
                  res.setHeader('Content-Type', 'application/json');
                  res.send(JSON.stringify({result: false}));
                }
              });
            }).on("error", function (error) {
              console.log(colors.red("[" + device.name + "] Error: Unable to update agent"));
              console.log(error);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({result: false}));
            });
            req.end();
            break;
        }
      }else{
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({result: false}));
      }
      break;
    }
  }
}

function rebootSystem(req, res, next) {
  var id=req.body.id;
  for(var j=0;j<configModule.config.devices.length;j++) {
    var device = configModule.config.devices[j];
    if (device.id===id){
      if(device.type!=='baikal-miner'){
        var arr = device.hostname.split("://");
        var protocol=arr[0];
        arr = arr[1].split(":");
        var path="/api/config/reboot";
        switch(protocol) {
          case "http":
            var req = http.request({
              host: arr[0],
              path: path,
              method: 'POST',
              port: arr[1],
              headers: {
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }, function (response) {
              response.setEncoding('utf8');
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function () {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: false}));
              });
            }).on("error", function (error) {
              console.log(colors.red("[" + device.name + "] Error: Unable to reboot system"));
              console.log(error);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({result: false}));
            });
            req.end();
            break;
          case "https":
            var req = https.request({
              host: arr[0],
              path: path,
              method: 'POST',
              port: arr[1],
              rejectUnauthorized: false,
              headers: {
                'Content-Type': 'application/json;charset=UTF-8'
              }
            }, function (response) {
              response.setEncoding('utf8');
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function () {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: true}));
              });
            }).on("error", function (error) {
              console.log(colors.red("[" + device.name + "] Error: Unable to reboot system"));
              console.log(error);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify({result: false}));
            });
            req.end();
            break;
        }
      }else{
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({result: false}));
      }
      break;
    }
  }
}

function verifyTransport(req,res,next){
  mailController.verifyTransport(function(result){
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: result}));
  });
}

function init() {
}

init();

exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.update = update;
exports.getLayout = getLayout;
exports.updateMiner = updateMiner;
exports.updateAgent = updateAgent;
exports.verifyTransport = verifyTransport;
exports.rebootSystem=rebootSystem;
