const https = require('https');
const axios = require('axios');
const url = require('url');
const colors = require('colors/safe');


const configModule = require(__basedir + 'api/modules/configModule');
const statsController = require(__basedir + 'api/controllers/statsController');

const mailService = require('../lib/services/mail-service');

Array.prototype.contains = (element) => this.indexOf(element) > -1;

function getLayout(req, res, next){
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(configModule.getConfig().layout));
}

function getConfig(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(configModule.getConfig()));
}
function setConfig(req, res) {
  configModule.setConfig(req.body); 
  configModule.saveConfig();
  statsController.restartInterval();
  mailService.createTransport();
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result: true}));
}

function update(req, res, next) {
  const spawn = require('cross-spawn');
  const isWin = /^win/.test(process.platform);
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

async function updateMiner(req, res, next) {
  const id = req.body.id;
  const devices = configModule.config.devices.filter((device) => (device.id === id && device.type !== 'baikal-miner'));
  if (devices.length === 1) {
    const device = devices[0];
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    let response = null;
    try {
      response = await axios.post(url.resolve(device.hostname, '/api/config/updateMiner'), null, {httpsAgent: agent});
    } catch (error) {
      console.log(colors.red("[" + device.name + "] Error: Unable to update miner"));
      console.log(error.message);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({result: false}));
    }
    if (response !== null) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({result: true}));
    }
  }else{
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: false}));
  }
}

async function updateAgent(req, res) {
  const id = req.body.id;
  const devices = configModule.config.devices.filter((device) => (device.id === id && device.type !== 'baikal-miner'));
  if (devices.length === 1) {
    const device = devices[0];
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    let response = null;
    try {
      response = await axios.post(url.resolve(device.hostname, '/api/config/update'), null, {httpsAgent: agent});
    } catch (error) {
      console.log(colors.red("[" + device.name + "] Error: Unable to update agent"));
      console.log(error.message);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({result: false}));
    }
    if (response !== null) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({result: true}));
    }
  }else{
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: false}));
  }
}

async function rebootSystem(req, res) {
  const id = req.body.id;
  const devices = configModule.config.devices.filter((device) => (device.id === id && device.type !== 'baikal-miner'));
  if (devices.length === 1) {
    const device = devices[0];
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    let response = null;
    try {
      response = await axios.post(url.resolve(device.hostname, '/api/config/reboot'), null, {httpsAgent: agent});
    } catch (error) {
      console.log(colors.red("[" + device.name + "] Error: Unable to reboot system"));
      console.log(error.message);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({result: false}));
    }
    if (response !== null) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({result: true}));
    }
  }else{
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: false}));
  }
}

async function restartShares(req, res) {
  const id = req.body.id;
  const node = req.query.node;
  const device = configModule.config.devices.find((device) => (device.id === id));
  if (!device || !node) {
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify({result: false}));
  }
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  let response = null;
  try {
    response = await axios.get(url.resolve(device.hostname, `/restart?node=${node}`), {httpsAgent: agent});
  } catch (error) {
    console.log(colors.red("[" + device.name + "] Error: Unable to restart shares"));
    console.log(error.message);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: false}));
  }
  if (response !== null) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response.data));
  }
}

async function verifyTransport(req,res,next){
  const result = await mailService.verifyTransport();
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({result}));
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
exports.rebootSystem = rebootSystem;
exports.restartShares = restartShares;
