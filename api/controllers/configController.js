const https = require('https');
const axios = require('axios');
const dnode = require('dnode');
const url = require('url');
const colors = require('colors/safe');


const configModule = require(__basedir + 'api/modules/configModule');
const statsController = require(__basedir + 'api/controllers/statsController');
const mailController = require(__basedir + 'api/controllers/mailController');

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
  statsController.cleanup();
  statsController.restartInterval();
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

function verifyTransport(req,res,next){
  mailController.verifyTransport((result) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: result}));
  });
}

async function restartStorjshareShares(req, res) {
  const id = req.body.id;
  const devices = configModule.config.devices.filter((device) => device.id === id);
  if (devices.length === 1) {
    const device = devices[0];
    let arr = device.hostname.split("://");
    arr = arr[arr.length === 1 ? 0 : 1];
    arr = arr.split("@");
    arr = arr[arr.length > 1 ? 1 : 0];
    arr = arr.split(":");
    const hostname = arr[0];
    const port = arr[1] ? arr[1] : 443;
    switch (device.type) {
      case 'storjshare-daemon':
        let sock = dnode.connect(hostname, port);

        sock.on('error', () => {
          sock = null;
          console.log(colors.red(`Error: daemon for device ${device.name} not running`));
        });

        sock.on('remote', (remote) => {
          remote.restart('*', (err) => {
            sock.end();
            sock = null;
            if (err) {
              console.error(`cannot restart node, reason: ${err.message}`);
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({result: true}));
          });
        });
        break;
      case 'storjshare-daemon-proxy':
        const agent = new https.Agent({
          rejectUnauthorized: false
        });
        let response = null;
        try {
          response = await axios.post(url.resolve(device.hostname, '/restart'), {param: '*'}, {httpsAgent: agent});
        } catch (error) {
          console.log(colors.red(`Error: daemon-proxy for device ${device.name} not running`));
          console.log(error.message);
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({result: false}));
        }
        if (response !== null) {
          res.setHeader('Content-Type', 'application/json');
          res.send(JSON.stringify({result: true}));
        }
        break;
    }
  }else{
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({result: false}));
  }
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
exports.restartStorjshareShares = restartStorjshareShares;
