const Rx = require('rx');
const semver = require('semver');
const axios = require('axios');

// Miner
const storjshare = require('../lib/miner/storjshare');
const minerManager = require('../lib/miner/minerManager');
const baikalMiner = require('../lib/miner/baikalMiner');
const openHardwareMonitor = require('../lib/miner/openHardwareMonitor');
const cloudAggregator = require('../lib/miner/cloudAggregator');

// Rates
const Coinmarketcap = require('../lib/rates/coinmarketcap');

// Util
const util = require('../lib/util');
const dashboardUtil = require('../lib/dashboards/dashboard-util');


const timeEvents = Rx.Observable.interval(500);

const configModule = require(__basedir + 'api/modules/configModule');
const mailController = require(__basedir + 'api/controllers/mailController');

const storjCoreTagUrl = 'https://api.github.com/repos/Storj/core/releases/latest';

let stats = {
  entries: {},
  dashboardData: {}
};

let instances = [];

let latestCoreRelease = null;

let problemCounter = {};

let groupIntervals = [];
let dashboardIntervals = [];

const coinmarketcap = new Coinmarketcap();

function getStats(req, res, next) {
  const entries = [];
  Object.keys(stats.entries).forEach((name) => {
    const devices = Object.keys(stats.entries[name]).map(function (id) {
      return stats.entries[name][id];
    });
    entries.push({name, devices});
  });
  const dashboardData = instances.map(instance => instance.getStats());
  dashboardData.sort(function (a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({entries, dashboardData, latestCoreRelease}));
}

// #############################
// #####     Reporting     #####
// #############################

function counterAndSend(problem) {
  if (problemCounter[problem.device.name] === undefined)
    problemCounter[problem.device.name] = {item: {}, deviceCounter: 0};
  switch (problem.type) {
    case 'device':
      if (problem.status === 'Problem') {
        problemCounter[problem.device.name].deviceCounter += 1;
        if (problemCounter[problem.device.name].deviceCounter === 6) {
          if (problem.device.display) {
            if (!stats.entries[problem.device.device.group]) {
              stats.entries[problem.device.device.group] = {};
            }
            stats.entries[problem.device.device.group][problem.device.device.id] = {
              type: problem.device.device.type,
              name: problem.device.device.name,
              hostname: problem.device.device.hostname,
            };
            if (problem.device.device.ohm) {
              stats.entries[problem.device.device.group][problem.device.device.id].devices = [];
            }
          }
          if (!problem.device.device.mailDisabled) {
            mailController.sendMail(problem, function (result) {
              //do something
            });
          }
        }
      } else {
        if (problemCounter[problem.device.name].deviceCounter >= 6) {
          if (!problem.device.device.mailDisabled) {
            mailController.sendMail(problem, function (result) {
              //do something
            });
          }
        }
        problemCounter[problem.device.name].deviceCounter = 0;
      }

      break;
    case 'item':
      if (problem.status === 'Problem') {
        if (problemCounter[problem.device.name].item[problem.item.name] === undefined)
          problemCounter[problem.device.name].item[problem.item.name] = {};
        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor] === undefined)
          problemCounter[problem.device.name].item[problem.item.name][problem.descriptor] = {low: 0, high: 0};
        problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] += 1;
        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] === 6) {
          if (!problem.device.device.mailDisabled) {
            mailController.sendMail(problem, function (result) {
              // do something
            });
          }
        }

      } else {
        if (problemCounter[problem.device.name].item[problem.item.name] === undefined)
          problemCounter[problem.device.name].item[problem.item.name] = {};
        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor] === undefined)
          problemCounter[problem.device.name].item[problem.item.name][problem.descriptor] = {low: 0, high: 0};

        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] >= 6) {
          if (!problem.device.device.mailDisabled) {
            mailController.sendMail(problem, function (result) {
              // do something
            });
          }
        }
        problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] = 0;
      }
      break;
  }
}

function checkResult(result, device, ohm) {
  switch (device.type) {
    case 'baikal-miner':
      for (var i = 0; i < result.devs.length; i++) {
        var dev = result.devs[i];
        if (dev.MHS5s < 100) {
          var obj = {
            type: 'item',
            status: 'Problem',
            descriptor: 'Hashrate',
            item: {name: 'dev' + i, value: dev.MHS5s + 'MH/s', highLow: 'low'},
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
          counterAndSend(obj);
        } else {
          var obj = {
            type: 'item',
            status: 'OK',
            descriptor: 'Hashrate',
            item: {name: 'dev' + i, value: dev.MHS5s + 'MH/s', highLow: 'low'},
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
          counterAndSend(obj);
        }
        if (dev.Rejected / dev.TotalShares > 0.1) {
          var obj = {
            type: 'item',
            status: 'Problem',
            descriptor: 'Rejects',
            item: {
              name: 'dev' + i,
              value: ((dev.Rejected / dev.TotalShares) * 100) + '%',
              highLow: 'high'
            },
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
          counterAndSend(obj);
        } else {
          var obj = {
            type: 'item',
            status: 'OK',
            descriptor: 'Rejects',
            item: {
              name: 'dev' + i,
              value: ((dev.Rejected / dev.TotalShares) * 100) + '%',
              highLow: 'high'
            },
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
          counterAndSend(obj);
        }
        if (dev.Temperature >= 60) {
          var obj = {
            type: 'item',
            status: 'Problem',
            descriptor: 'Temperature',
            item: {name: 'dev' + i, value: dev.Temperature + ' °C', highLow: 'high'},
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
          counterAndSend(obj);
        } else {
          var obj = {
            type: 'item',
            status: 'OK',
            descriptor: 'Temperature',
            item: {name: 'dev' + i, value: dev.Temperature + ' °C', highLow: 'high'},
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
          counterAndSend(obj);
        }
      }

      break;
    case 'miner-agent':
      if (ohm) {
        for (var i = 0; i < result.length; i++) {
          var ohmDevice = result[i];
          //temp
          if (ohmDevice.temp !== undefined && ohmDevice.temp > "90") {
            var obj = {
              type: 'item',
              status: 'Problem',
              descriptor: 'Temperature',
              item: {name: i + ': ' + ohmDevice.dev, value: ohmDevice.temp, highLow: 'high'},
              device: {name: device.name, value: 'Up', url: device.hostname, device}
            };
            counterAndSend(obj);
          } else {
            var obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Temperature',
              item: {name: i + ': ' + ohmDevice.dev, value: ohmDevice.temp, highLow: 'high'},
              device: {name: device.name, value: 'Up', url: device.hostname, device}
            };
            counterAndSend(obj);
          }
          //fan speed
          /*if(ohmDevice.fan!==undefined&&ohmDevice.fan>"80"){
           var obj={type:'item',status:'Problem',descriptor:'Fan Speed',item:{name:i+': '+ohmDevice.dev,value:ohmDevice.fan,highLow:'high'},device:{name:device.name,value:'Up'}};
           counterAndSend(obj);
           }else{
           var obj={type:'item',status:'OK',descriptor:'Fan Speed',item:{name:i+': '+ohmDevice.dev,value:ohmDevice.fan,highLow:'high'},device:{name:device.name,value:'Up'}};
           counterAndSend(obj);
           }*/
          /*
           //load
           if(ohmDevice.load!==undefined&&ohmDevice.load<"70"){
           var obj={type:'item',status:'Problem',descriptor:'Load',item:{name:i+': '+ohmDevice.dev,value:ohmDevice.load,highLow:'low'},device:{name:device.name,value:'Up'}};
           counterAndSend(obj);
           }else{
           var obj={type:'item',status:'OK',descriptor:'Load',item:{name:i+': '+ohmDevice.dev,value:ohmDevice.load,highLow:'low'},device:{name:device.name,value:'Up'}};
           counterAndSend(obj);
           }
           */
        }
      } else {
        let obj = null;
        if (result.entries && !Object.keys(result.entries).length) {
          obj = {
            type: 'item',
            status: 'Problem',
            descriptor: 'Number',
            item: {name: 'running miners', value: Object.keys(result.entries).length, highLow: 'low'},
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
        } else {
          obj = {
            type: 'item',
            status: 'OK',
            descriptor: 'Number',
            item: {name: 'running miners', value: Object.keys(result.entries).length, highLow: 'low'},
            device: {name: device.name, value: 'Up', url: device.hostname, device}
          };
        }
        counterAndSend(obj);
      }
      break;
  }
}

// #################################
// #####     miner-manager     #####
// #################################

async function getMinerStats(device, display) {
  let minerData = null;
  try {
    switch (device.type) {
      case "baikal-miner":
        minerData = await baikalMiner(device);
        break;
      case "miner-agent":
        minerData = await minerManager(device);
        break;
      case "cloud-aggregator":
        minerData = await cloudAggregator(device);
        break;
    }
  } catch (error) {
    console.log(`[${device.name} :: Miner-Manager] => ${error.message}`);
    counterAndSend({
      type: 'device',
      status: 'Problem',
      descriptor: '',
      item: {},
      device: {name: device.name, value: 'Down', device, display}
    });
  }
  if (minerData) {
    counterAndSend({
      type: 'device',
      status: 'OK',
      descriptor: '',
      item: {},
      device: {name: device.name, value: 'Up', device, display}
    });
    checkResult(minerData, device, false);
    if (display) {
      if (!stats.entries[device.group]) {
        stats.entries[device.group] = {};
      }
      stats.entries[device.group][device.id] = Object.assign(stats.entries[device.group][device.id] || {}, minerData);
    }
  }
}

async function getOhmStats(device, display) {
  let ohmData = null;
  try {
    ohmData = await openHardwareMonitor(device);
  } catch (error) {
    console.log(`[${device.name} :: OpenHardwareMonitor] => ${error.message}`);
  }
  if (ohmData) {
    checkResult(ohmData, device, true);
    if (display) {
      if (!stats.entries[device.group]) {
        stats.entries[device.group] = {};
      }
      stats.entries[device.group][device.id] = Object.assign(stats.entries[device.group][device.id] || {}, ohmData);
    }
  }
}


// #########################
// #####     Storj     #####
// #########################

async function getStorjshareDaemonStats(device, display) {
  let arr = device.hostname.split("://");
  arr = arr[arr.length === 1 ? 0 : 1];
  arr = arr.split("@");
  let user = null;
  let pass = null;
  if (arr.length > 1) {
    const auth = arr[0].split(":");
    user = auth[0];
    pass = auth[1];
    arr = arr[1];
  } else {
    arr = arr[0];
  }
  arr = arr.split(":");
  const hostname = arr[0];
  const port = arr[1] ? arr[1] : 443;

  let storjshareData = null;
  switch (device.type) {
    case 'storjshare-daemon':
      try {
        storjshareData = await storjshare.getStorjshareDaemonStats(hostname, port);
      } catch (error) {
        console.log(`[${device.name} :: StorjShare-Daemon] => ${error.message}`);
      }
      break;
    case 'storjshare-daemon-proxy':
      try {
        storjshareData = await storjshare.getStorjshareDaemonProxyStats(device.hostname);
      } catch (error) {
        console.log(`[${device.name} :: StorjShare-Daemon-Proxy] => ${error.message}`);
      }
      break;
  }
  if (!storjshareData) {
    counterAndSend({
      type: 'device',
      status: 'Problem',
      descriptor: '',
      item: {},
      device: {name: device.name, value: 'Down', device, display}
    });
  } else {
    counterAndSend({
      type: 'device',
      status: 'OK',
      descriptor: '',
      item: {},
      device: {name: device.name, value: 'Up', device, display}
    });
  }
  if (display) {
    let obj = {
      type: device.type,
      name: device.name,
    };
    if (storjshareData) {
      if (stats.entries[device.group] &&
        stats.entries[device.group][device.id] &&
        stats.entries[device.group][device.id].shares) {
        const statsObj = stats.entries[device.group][device.id];
        obj = Object.assign(obj, storjshare.mergeStorjshareStats(statsObj, storjshareData));
      } else {
        obj.shares = storjshareData;
      }
    }
    if (stats.entries[device.group] === undefined || stats.entries[device.group] === null) {
      stats.entries[device.group] = {};
    }
    stats.entries[device.group][device.id] = obj;
  }
}

async function getStorjshareBridgeApiStats() {
  for (let groupName in stats.entries) {
    for (let entryId in stats.entries[groupName]) {
      const entry = stats.entries[groupName][entryId];
      if ((entry.type === 'storjshare-daemon' || entry.type === 'storjshare-daemon-proxy') && entry.shares) {
        let avgRt = 0;
        let avgTr = 0;
        let avgRp = 0;
        let counter1 = 0;
        let counter2 = 0;
        let counter3 = 0;
        for (let i = 0; i < entry.shares.length; i++) {
          const share = entry.shares[i];
          let bridgeStats = null;
          try {
            bridgeStats = await storjshare.getBridgeStats(share.id);
          } catch (error) {
            console.log(`[${entry.name} :: StorjShare-Bridge-API] => ${error.message}`);
          }
          if (bridgeStats) {
            // use stats.entries[groupName][entryId].shares[i] to not write to old references
            if (bridgeStats.responseTime !== undefined) {
              stats.entries[groupName][entryId].shares[i].rt = bridgeStats.responseTime > 1000 ? `${(bridgeStats.responseTime / 1000).toFixed(2)} s` : `${bridgeStats.responseTime.toFixed(0)} ms`;
              avgRt += bridgeStats.responseTime;
              counter1 += 1;
            } else {
              stats.entries[groupName][entryId].shares[i].rt = 'N/A';
            }
            if (bridgeStats.timeoutRate !== undefined) {
              stats.entries[groupName][entryId].shares[i].tr = `${(bridgeStats.timeoutRate * 100).toFixed(2)} %`;
            } else {
              stats.entries[groupName][entryId].shares[i].tr = '0.00 %';
            }
            stats.entries[groupName][entryId].shares[i].hasTr = ((bridgeStats.timeoutRate || 0) !== 0);
            if (bridgeStats.userAgent !== undefined && latestCoreRelease) {
              stats.entries[groupName][entryId].shares[i].isUp2Date = semver.gte(bridgeStats.userAgent, latestCoreRelease);
            } else {
              stats.entries[groupName][entryId].shares[i].isUp2Date = true;
            }
            stats.entries[groupName][entryId].shares[i].rp = bridgeStats.reputation || 0;
            avgTr += bridgeStats.timeoutRate || 0;
            counter2 += 1;
            avgRp += bridgeStats.reputation || 0;
            counter3 += 1;
          }
        }
        avgRp = avgRp / (counter3 ? counter3 : 1);
        avgRt = avgRt / (counter1 ? counter1 : 1);
        avgTr = avgTr / (counter2 ? counter2 : 1);
        stats.entries[groupName][entryId].avgRt = avgRt > 1000 ? `${(avgRt / 1000).toFixed(2)} s` : `${avgRt.toFixed(0)} ms`;
        stats.entries[groupName][entryId].avgTr = `${(avgTr * 100).toFixed(2)} %`;
        stats.entries[groupName][entryId].avgRp = avgRp.toFixed(0);
      }
    }
  }
}

async function initializeAllDashboards() {
  const dashboards = configModule.config.dashboardData
    .filter(dashboard => dashboard.enabled);
  const nonNicehashDashboards = dashboards.filter(dashboard => dashboard.type !== 'nicehash');
  const nicehashDashboards = dashboards.filter(dashboard => dashboard.type === 'nicehash');
  instances = [];
  for (const dashboard of nonNicehashDashboards) {
    const Class = dashboardUtil.getClassForDashboardType(dashboard.type);
    instances.push(new Class({ dashboard }, coinmarketcap));
    await util.sleep(1);
  }
  // start nicehash dashboards with 31 sec delays to workaround nicehash api limits
  for (const dashboard of nicehashDashboards) {
    const Class = dashboardUtil.getClassForDashboardType(dashboard.type);
    instances.push(new Class({ dashboard }, coinmarketcap));
    await util.sleep(31);
  }
}

// ####################
// #####   Init   #####
// ####################

function initAllMinerStats() {
  for (var i = 0; i < configModule.config.groups.length; i++) {
    var group = configModule.config.groups[i];
    ((group) => {
      if (group.enabled) {
        const deviceArr = [];
        for (var j = 0; j < configModule.config.devices.length; j++) {
          var device = configModule.config.devices[j];
          if (device.enabled && device.group === group.name) {
            deviceArr.push(device);
          }
        }
        const deviceEvents = Rx.Observable
          .fromArray(deviceArr);

        Rx.Observable.zip(timeEvents, deviceEvents, (i, device) => device)
          .subscribe(device => {
            if (device.type === 'storjshare-daemon' || device.type === 'storjshare-daemon-proxy') {
              getStorjshareDaemonStats(device, group.display);
            } else {
              getMinerStats(JSON.parse(JSON.stringify(device)), group.display);
              if (device.ohm !== undefined && device.ohm !== null && device.ohm !== "")
                getOhmStats(JSON.parse(JSON.stringify(device)), group.display);
            }
          });
      }
      groupIntervals.push(setInterval(() => {
        if (group.enabled) {
          const deviceArr = [];
          for (var j = 0; j < configModule.config.devices.length; j++) {
            var device = configModule.config.devices[j];
            if (device.enabled && device.group === group.name) {
              deviceArr.push(device);
            }
          }
          const deviceEvents = Rx.Observable
            .fromArray(deviceArr);

          Rx.Observable.zip(timeEvents, deviceEvents, (i, device) => device)
            .subscribe(device => {
              if (device.type === 'storjshare-daemon' || device.type === 'storjshare-daemon-proxy') {
                getStorjshareDaemonStats(device, group.display);
              } else {
                getMinerStats(JSON.parse(JSON.stringify(device)), group.display);
                if (device.ohm !== undefined && device.ohm !== null && device.ohm !== "")
                  getOhmStats(JSON.parse(JSON.stringify(device)), group.display);
              }
            });
        }
      }, (group.interval ? group.interval : configModule.config.interval) * 1000));
    })(group);
  }
}

async function updateLatestCoreRelease() {
  try {
    const tag = semver.valid((await axios.get(storjCoreTagUrl)).data.tag_name);
    if (tag) {
      latestCoreRelease = tag;
    }
  } catch (err) {
    console.log(`[UpdateLatestCoreRelease] => ${err.message}`);
  }
}

function cleanup() {
  stats.entries = {};
  stats.dashboardData = {};
  // problemCounter={};
}

function restartInterval() {
  groupIntervals.forEach((interval) => {
    clearInterval(interval);
  });
  groupIntervals = [];
  dashboardIntervals.forEach((interval) => {
    clearInterval(interval);
  });
  dashboardIntervals = [];
  init();
}

function init() {
  initializeAllDashboards();
  initAllMinerStats();
  updateLatestCoreRelease();
  setTimeout(getStorjshareBridgeApiStats, 20 * 1000); // delayed init
  dashboardIntervals.push(setInterval(getStorjshareBridgeApiStats, 10 * 60 * 1000));
  dashboardIntervals.push(setInterval(updateLatestCoreRelease, 10 * 60 * 1000));
}

setTimeout(init, 2000);

exports.getStats = getStats;
exports.restartInterval = restartInterval;
exports.cleanup = cleanup;
