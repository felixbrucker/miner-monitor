'use strict';

const https = require('https');
const http = require('http');
var colors = require('colors/safe');


var configModule = require(__basedir + 'api/modules/configModule');
var statsController = require(__basedir + 'api/controllers/statsController');

Array.prototype.contains = function (element) {
  return this.indexOf(element) > -1;
};

function getConfig(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(configModule.getConfig()));
}
function setConfig(req, res, next) {
  var prev=JSON.parse(JSON.stringify(configModule.config.interval));
  configModule.setConfig(req.body);
  if (prev!==req.body.interval)
    statsController.restartInterval();
  configModule.saveConfig();
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: true}));
}

function update(req, res, next) {
  const spawn = require('cross-spawn');
  const child = spawn('git', ['pull'], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: true}));
}


function init() {
}

init();

exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.update = update;
