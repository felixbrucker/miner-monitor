const https = require('https');
const http = require('http');
const getExchangeRates = require("get-exchange-rates");
const fs = require('fs');
const path = require('path');
const colors = require('colors/safe');
const Rx = require('rx');
const dnode = require('dnode');
const bytes = require('bytes');

// Miner
const storjshare = require('../lib/miner/storjshare');
const minerManager = require('../lib/miner/minerManager');
const baikalMiner = require('../lib/miner/baikalMiner');
const openHardwareMonitor = require('../lib/miner/openHardwareMonitor');

// Pools
const nicehash = require('../lib/pool/nicehash');
const mph = require('../lib/pool/mph');
const mpos = require('../lib/pool/mpos');

// Balances
const ethplorer = require('../lib/balances/ethplorer.io');
const counterpartychain = require('../lib/balances/counterpartychain.io');
const cryptoid = require('../lib/balances/chainz.cryptoid.info');
const blockchain = require('../lib/balances/blockchain.info');
const burstcoinBiz = require('../lib/balances/burstcoin.biz');


const timeEvents = Rx.Observable.interval(500);

const nicehashTimeEvents = Rx.Observable.interval(11 * 1000); // stupid nicehash rate limit

const configModule = require(__basedir + 'api/modules/configModule');
const mailController = require(__basedir + 'api/controllers/mailController');

let stats = {
  entries: {},
  dashboardData: {}
};

let exchangeRates = {
  eurPerBTC: 0,
  usdPerBTC: 0,
};

let problemCounter = {};

let groupIntervals = [];
let dashboardIntervals = [];

function getStats(req, res, next) {
  const entries = [];
  Object.keys(stats.entries).forEach((name) => {
    const devices = Object.keys(stats.entries[name]).map(function (id) {
      return stats.entries[name][id];
    });
    entries.push({name, devices});
  });
  const dashboardData = [];
  Object.keys(stats.dashboardData).forEach((key) => {
    dashboardData.push(stats.dashboardData[key]);
  });
  dashboardData.sort(function (a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({entries, dashboardData}));
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
        if (problemCounter[problem.device.name].deviceCounter === 6){
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
          mailController.sendMail(problem, function (result) {
            //do something
          });
        }
      } else {
        if (problemCounter[problem.device.name].deviceCounter >= 6)
          mailController.sendMail(problem, function (result) {
            //do something
          });
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
        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] === 6)
          mailController.sendMail(problem, function (result) {
            // do something
          });
      } else {
        if (problemCounter[problem.device.name].item[problem.item.name] === undefined)
          problemCounter[problem.device.name].item[problem.item.name] = {};
        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor] === undefined)
          problemCounter[problem.device.name].item[problem.item.name][problem.descriptor] = {low: 0, high: 0};

        if (problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] >= 6)
          mailController.sendMail(problem, function (result) {
            // do something
          });
        problemCounter[problem.device.name].item[problem.item.name][problem.descriptor][problem.item.highLow] = 0;
      }
      break;
  }

}

function checkResult(result, device, ohm) {
  if (!device.mailDisabled) {
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
              device: {name: device.name, value: 'Up', url: device.hostname}
            };
            counterAndSend(obj);
          } else {
            var obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Hashrate',
              item: {name: 'dev' + i, value: dev.MHS5s + 'MH/s', highLow: 'low'},
              device: {name: device.name, value: 'Up', url: device.hostname}
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
              device: {name: device.name, value: 'Up', url: device.hostname}
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
              device: {name: device.name, value: 'Up', url: device.hostname}
            };
            counterAndSend(obj);
          }
          if (dev.Temperature >= 60) {
            var obj = {
              type: 'item',
              status: 'Problem',
              descriptor: 'Temperature',
              item: {name: 'dev' + i, value: dev.Temperature + ' °C', highLow: 'high'},
              device: {name: device.name, value: 'Up', url: device.hostname}
            };
            counterAndSend(obj);
          } else {
            var obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Temperature',
              item: {name: 'dev' + i, value: dev.Temperature + ' °C', highLow: 'high'},
              device: {name: device.name, value: 'Up', url: device.hostname}
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
                device: {name: device.name, value: 'Up', url: device.hostname}
              };
              counterAndSend(obj);
            } else {
              var obj = {
                type: 'item',
                status: 'OK',
                descriptor: 'Temperature',
                item: {name: i + ': ' + ohmDevice.dev, value: ohmDevice.temp, highLow: 'high'},
                device: {name: device.name, value: 'Up', url: device.hostname}
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
              device: {name: device.name, value: 'Up', url: device.hostname}
            };
          } else {
            obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Number',
              item: {name: 'running miners', value: Object.keys(result.entries).length, highLow: 'low'},
              device: {name: device.name, value: 'Up', url: device.hostname}
            };
          }
          counterAndSend(obj);
        }
        break;
    }
  }
}

// #################################
// #####     miner-manager     #####
// #################################

async function getMinerStats(device, display) {
  let minerData = null;
  try {
    switch(device.type) {
      case "baikal-miner":
        minerData = await baikalMiner(device);
        break;
      case "miner-agent":
        minerData = await minerManager(device);
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
      device: {name: device.name, value: 'Up'}
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
  if(!storjshareData) {
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
      device: {name: device.name, value: 'Up'}
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
        let counter1 = 0;
        let counter2 = 0;
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
            avgTr += bridgeStats.timeoutRate ? bridgeStats.timeoutRate : 0;
            counter2 += 1;
          }
        }
        avgRt = avgRt / (counter1 ? counter1 : 1);
        avgTr = avgTr / (counter2 ? counter2 : 1);
        stats.entries[groupName][entryId].avgRt = avgRt > 1000 ? `${(avgRt / 1000).toFixed(2)} s` : `${avgRt.toFixed(0)} ms`;
        stats.entries[groupName][entryId].avgTr = `${(avgTr * 100).toFixed(2)} %`;
      }
    }
  }
}

// #########################
// #####     Pools     #####
// #########################

async function getAllNicehashStats() {
  const nicehashDashboards = [];
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'nicehash' && dashboard.enabled) {
      nicehashDashboards.push(dashboard);
    }
  }

  const nicehashDashboardEvents = Rx.Observable
    .fromArray(nicehashDashboards);

  Rx.Observable.zip(nicehashTimeEvents, nicehashDashboardEvents, (i, dashboard) => dashboard)
    .subscribe(async (dashboard) => {
      let poolData = null;
      try {
        poolData = await nicehash(dashboard.address, exchangeRates);
      } catch (error) {
        console.log(`[${dashboard.name} :: Nicehash-API] => ${error.message}`);
      }
      if (poolData) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: poolData,
        };
      }
    });
}

async function getAllMPHStats() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'miningpoolhub' && dashboard.enabled) {
      let poolData = null;
      try {
        poolData = await mph(dashboard.address, dashboard.api_key, dashboard.user_id);
      } catch (error) {
        console.log(`[${dashboard.name} :: MiningPoolHub-API] => ${error.message}`);
      }
      if (poolData) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: poolData,
        };
      }
    }
  }
}

async function getAllMPOSStats() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'genericMPOS' && dashboard.enabled) {
      let poolData = null;
      try {
        poolData = await mpos(dashboard.address, dashboard.baseUrl, dashboard.api_key, dashboard.user_id, dashboard.hrModifier);
      } catch (error) {
        console.log(`[${dashboard.name} :: MPOS-API] => ${error.message}`);
      }
      if (poolData) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: poolData,
        };
      }
    }
  }
}

// ########################
// #####   Balances   #####
// ########################

async function getAllBitcoinbalances() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'bitcoinBalance' && dashboard.enabled) {
      let balanceData = null;
      try {
        balanceData = await blockchain(dashboard.address);
      } catch (error) {
        console.log(`[${dashboard.name} :: Blockchain-API] => ${error.message}`);
      }
      if (balanceData !== null) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: balanceData,
          addr: dashboard.address,
        };
      }
    }
  }
}

async function getAllCryptoidBalances() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'cryptoidBalance' && dashboard.enabled) {
      let balanceData = null;
      try {
        balanceData = await cryptoid(dashboard.address, dashboard.ticker, dashboard.api_key);
      } catch (error) {
        console.log(`[${dashboard.name} :: CryptoID-API] => ${error.message}`);
      }
      if (balanceData !== null) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: balanceData,
          ticker: dashboard.ticker.toUpperCase(),
          addr: dashboard.address,
        };
      }
    }
  }
}

async function getAllCounterpartyBalances() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'counterpartyBalance' && dashboard.enabled) {
      let balanceData = null;
      try {
        balanceData = await counterpartychain(dashboard.address);
      } catch (error) {
        console.log(error);
      }
      if (balanceData !== null) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: balanceData,
          addr: dashboard.address,
        };
      }
    }
  }
}

async function getAllEthStats() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'ethBalance' && dashboard.enabled) {
      let balanceData = null;
      try {
        balanceData = await ethplorer(dashboard.address);
      } catch (error) {
        console.log(`[${dashboard.name} :: Ethplorer-API] => ${error.message}`);
      }
      if (balanceData !== null) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: balanceData,
          addr: dashboard.address,
        };
      }
    }
  }
}

async function getAllBurstStats() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'burstBalance' && dashboard.enabled) {
      let balanceData = null;
      try {
        balanceData = await burstcoinBiz(dashboard.address);
      } catch (error) {
        console.log(`[${dashboard.name} :: BurstTeam-API] => ${error.message}`);
      }
      if (balanceData !== null) {
        stats.dashboardData[dashboard.id] = {
          name: dashboard.name,
          type: dashboard.type,
          enabled: dashboard.enabled,
          data: balanceData,
          addr: dashboard.address,
        };
      }
    }
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

function updateExchangeRates() {
  getExchangeRates()
    .then(rates => {
      exchangeRates.eurPerBTC = 1 / rates.BTC;
      exchangeRates.usdPerBTC = exchangeRates.eurPerBTC * rates.USD;
    })
    .catch(err => {
      console.log(err);
    });
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
  initAllMinerStats();
  getAllNicehashStats();
  getAllBitcoinbalances();
  getAllMPHStats();
  getAllMPOSStats();
  updateExchangeRates();
  getAllCryptoidBalances();
  getAllCounterpartyBalances();
  getAllEthStats();
  getAllBurstStats();
  setTimeout(getStorjshareBridgeApiStats, 20 * 1000); // delayed init
  dashboardIntervals.push(setInterval(getAllMPHStats, 1 * 60 * 1000));
  dashboardIntervals.push(setInterval(getAllBitcoinbalances, 3 * 60 * 1000));
  dashboardIntervals.push(setInterval(getAllMPOSStats, 30000));
  dashboardIntervals.push(setInterval(updateExchangeRates, 3 * 60 * 1000));
  dashboardIntervals.push(setInterval(getAllCryptoidBalances, 3 * 60 * 1000));
  dashboardIntervals.push(setInterval(getAllCounterpartyBalances, 3 * 60 * 1000));
  dashboardIntervals.push(setInterval(getAllEthStats, 3 * 60 * 1000));
  dashboardIntervals.push(setInterval(getStorjshareBridgeApiStats, 10 * 60 * 1000));
  dashboardIntervals.push(setInterval(getAllBurstStats, 3 * 60 * 1000));

  const nicehashDashboards = [];
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'nicehash' && dashboard.enabled) {
      nicehashDashboards.push(dashboard);
    }
  }
  dashboardIntervals.push(setInterval(getAllNicehashStats, (nicehashDashboards.length ? nicehashDashboards.length : 1) * 11 * 1000)); // stupid nicehash rate limit
}

setTimeout(init, 2000);

exports.getStats = getStats;
exports.restartInterval = restartInterval;
exports.cleanup = cleanup;
