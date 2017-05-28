const https = require('https');
const http = require('http');
const getExchangeRates = require("get-exchange-rates");
var fs = require('fs');
var path = require('path');
var colors = require('colors/safe');
const Rx = require('rx');
const dnode = require('dnode');
const bytes = require('bytes');

// Pools
const nicehash = require('../lib/pool/nicehash');
const mph = require('../lib/pool/mph');
const mpos = require('../lib/pool/mpos');

// Balances
const ethplorer = require('../lib/balances/ethplorer.io');
const counterpartychain = require('../lib/balances/counterpartychain.io');
const cryptoid = require('../lib/balances/chainz.cryptoid.info');
const blockchain = require('../lib/balances/blockchain.info');


const timeEvents = Rx.Observable.interval(500);

var configModule = require(__basedir + 'api/modules/configModule');
var mailController = require(__basedir + 'api/controllers/mailController');

var stats = {
  entries: {},
  dashboardData: {}
};

let exchangeRates = {
  eurPerBTC: 0,
  usdPerBTC: 0,
};

var problemCounter = {};

var nhinterval = null;
var btcBalanceInterval = null;
var mphInterval = null;
var mposInterval = null;

let groupIntervals = [];

function getStats(req, res, next) {
  var entries = [];
  Object.keys(stats.entries).forEach((key) => {
    var arr = Object.keys(stats.entries[key]).map(function (key2) {
      return stats.entries[key][key2];
    });
    entries.push({name: key, devices: arr});
  });
  var dashboardData = [];
  Object.keys(stats.dashboardData).forEach((key) => {
    dashboardData.push(stats.dashboardData[key]);
  });
  dashboardData.sort(function (a, b) {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({entries: entries, dashboardData}));
}

function counterAndSend(problem) {
  if (problemCounter[problem.device.name] === undefined)
    problemCounter[problem.device.name] = {item: {}, deviceCounter: 0};
  switch (problem.type) {
    case 'device':
      if (problem.status === 'Problem') {
        problemCounter[problem.device.name].deviceCounter += 1;
        if (problemCounter[problem.device.name].deviceCounter === 6)
          mailController.sendMail(problem, function (result) {
            //do something
          });
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
              device: {name: device.name, value: 'Up'}
            };
            counterAndSend(obj);
          } else {
            var obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Hashrate',
              item: {name: 'dev' + i, value: dev.MHS5s + 'MH/s', highLow: 'low'},
              device: {name: device.name, value: 'Up'}
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
              device: {name: device.name, value: 'Up'}
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
              device: {name: device.name, value: 'Up'}
            };
            counterAndSend(obj);
          }
          if (dev.Temperature >= 60) {
            var obj = {
              type: 'item',
              status: 'Problem',
              descriptor: 'Temperature',
              item: {name: 'dev' + i, value: dev.Temperature + ' °C', highLow: 'high'},
              device: {name: device.name, value: 'Up'}
            };
            counterAndSend(obj);
          } else {
            var obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Temperature',
              item: {name: 'dev' + i, value: dev.Temperature + ' °C', highLow: 'high'},
              device: {name: device.name, value: 'Up'}
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
                device: {name: device.name, value: 'Up'}
              };
              counterAndSend(obj);
            } else {
              var obj = {
                type: 'item',
                status: 'OK',
                descriptor: 'Temperature',
                item: {name: i + ': ' + ohmDevice.dev, value: ohmDevice.temp, highLow: 'high'},
                device: {name: device.name, value: 'Up'}
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
              device: {name: device.name, value: 'Up'}
            };
          } else {
            obj = {
              type: 'item',
              status: 'OK',
              descriptor: 'Number',
              item: {name: 'running miners', value: Object.keys(result.entries).length, highLow: 'low'},
              device: {name: device.name, value: 'Up'}
            };
          }
          counterAndSend(obj);
        }
        break;
    }
  }
}

function getMinerStats(device, display) {
  var arr = device.hostname.split("://");
  var protocol = arr[0];
  arr = arr[1].split(":");
  var path = "";
  switch (device.type) {
    case "baikal-miner":
      path = "/f_status.php?all=1";
      break;
    case "miner-agent":
      path = "/api/mining/stats";
      break;
  }
  switch (protocol) {
    case "http":
      var req = http.request({
        host: arr[0],
        path: path,
        method: 'GET',
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
          //console.log(body);
          var parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            console.log(colors.red("[" + device.name + "] Error: Unable to get stats data"));
            counterAndSend({
              type: 'device',
              status: 'Problem',
              descriptor: '',
              item: {},
              device: {name: device.name, value: 'Down'}
            });
          }
          if (parsed != null) {
            counterAndSend({
              type: 'device',
              status: 'OK',
              descriptor: '',
              item: {},
              device: {name: device.name, value: 'Up'}
            });
            switch (device.type) {
              case "baikal-miner":
                if (parsed.status !== false) {
                  parsed.status.type = device.type;
                  parsed.status.name = device.name;
                  parsed.status.hostname = device.hostname;
                  checkResult(parsed.status, device, false);
                  if (display) {
                    if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                      stats.entries[device.group][device.id] = parsed.status;
                    else {
                      stats.entries[device.group] = {};
                      stats.entries[device.group][device.id] = parsed.status;
                    }
                  }
                }
                break;
              case "miner-agent":
                checkResult(parsed, device, false);
                if (display) {
                  if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                    if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                      stats.entries[device.group][device.id].type = device.type;
                      stats.entries[device.group][device.id].name = device.name;
                      stats.entries[device.group][device.id].hostname = device.hostname;
                      stats.entries[device.group][device.id].entries = parsed.entries;
                    } else {
                      stats.entries[device.group][device.id] = {
                        type: device.type,
                        name: device.name,
                        entries: parsed.entries,
                        hostname: device.hostname
                      };
                    }
                  else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      entries: parsed.entries,
                      hostname: device.hostname
                    };
                  }
                }
                break;
            }
          } else {
            switch (device.type) {
              case "baikal-miner":
                if (display) {
                  if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      devs: {},
                      hostname: device.hostname
                    };
                  else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      devs: {},
                      hostname: device.hostname
                    };
                  }
                }
                break;
              case "miner-agent":
                if (display) {
                  if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                    if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                      stats.entries[device.group][device.id].type = device.type;
                      stats.entries[device.group][device.id].name = device.name;
                      stats.entries[device.group][device.id].hostname = device.hostname;
                      stats.entries[device.group][device.id].entries = {};
                    } else {
                      stats.entries[device.group][device.id] = {
                        type: device.type,
                        name: device.name,
                        entries: {},
                        hostname: device.hostname
                      };
                    }
                  else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      entries: {},
                      hostname: device.hostname
                    };
                  }
                }
                break;
            }
          }
        });
      }).on("error", function (error) {
        counterAndSend({
          type: 'device',
          status: 'Problem',
          descriptor: '',
          item: {},
          device: {name: device.name, value: 'Down'}
        });
        if (display) {
          switch (device.type) {
            case "baikal-miner":
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                stats.entries[device.group][device.id] = {
                  type: device.type,
                  name: device.name,
                  devs: {},
                  hostname: device.hostname
                };
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {
                  type: device.type,
                  name: device.name,
                  devs: {},
                  hostname: device.hostname
                };
              }
              break;
            case "miner-agent":
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                  stats.entries[device.group][device.id].type = device.type;
                  stats.entries[device.group][device.id].name = device.name;
                  stats.entries[device.group][device.id].hostname = device.hostname;
                  stats.entries[device.group][device.id].entries = {};
                } else {
                  stats.entries[device.group][device.id] = {
                    type: device.type,
                    name: device.name,
                    entries: {},
                    hostname: device.hostname
                  };
                }
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {
                  type: device.type,
                  name: device.name,
                  entries: {},
                  hostname: device.hostname
                };
              }
              break;
          }
        }
        console.log(colors.red("[" + device.name + "] Error: Unable to get stats data (" + error.code + ")"));
      });
      req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
          req.abort();
        });
      });
      req.end();
      break;
    case "https":
      var req = https.request({
        host: arr[0],
        path: path,
        method: 'GET',
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
          //console.log(body);
          var parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            console.log(colors.red("[" + device.name + "] Error: Unable to get stats data"));
            counterAndSend({
              type: 'device',
              status: 'Problem',
              descriptor: '',
              item: {},
              device: {name: device.name, value: 'Down'}
            });
          }
          if (parsed != null) {
            counterAndSend({
              type: 'device',
              status: 'OK',
              descriptor: '',
              item: {},
              device: {name: device.name, value: 'Up'}
            });
            switch (device.type) {
              case "baikal-miner":
                if (parsed.status !== false) {
                  parsed.status.type = device.type;
                  parsed.status.name = device.name;
                  parsed.status.hostname = device.hostname;
                  checkResult(parsed.status, device, false);
                  if (display) {
                    if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                      stats.entries[device.group][device.id] = parsed.status;
                    else {
                      stats.entries[device.group] = {};
                      stats.entries[device.group][device.id] = parsed.status;
                    }
                  }
                }
                break;
              case "miner-agent":
                checkResult(parsed, device, false);
                if (display) {
                  if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                    if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                      stats.entries[device.group][device.id].type = device.type;
                      stats.entries[device.group][device.id].name = device.name;
                      stats.entries[device.group][device.id].hostname = device.hostname;
                      stats.entries[device.group][device.id].entries = parsed.entries;
                    } else {
                      stats.entries[device.group][device.id] = {
                        type: device.type,
                        name: device.name,
                        entries: parsed.entries,
                        hostname: device.hostname
                      };
                    }
                  else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      entries: parsed.entries,
                      hostname: device.hostname
                    };
                  }
                }
                break;
            }
          } else {
            if (display) {
              switch (device.type) {
                case "baikal-miner":
                  if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      devs: {},
                      hostname: device.hostname
                    };
                  else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      devs: {},
                      hostname: device.hostname
                    };
                  }
                  break;
                case "miner-agent":
                  if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                    if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                      stats.entries[device.group][device.id].type = device.type;
                      stats.entries[device.group][device.id].name = device.name;
                      stats.entries[device.group][device.id].hostname = device.hostname;
                      stats.entries[device.group][device.id].entries = {};
                    } else {
                      stats.entries[device.group][device.id] = {
                        type: device.type,
                        name: device.name,
                        entries: {},
                        hostname: device.hostname
                      };
                    }
                  else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = {
                      type: device.type,
                      name: device.name,
                      entries: {},
                      hostname: device.hostname
                    };
                  }
                  break;
              }
            }
          }
        });
      }).on("error", function (error) {
        counterAndSend({
          type: 'device',
          status: 'Problem',
          descriptor: '',
          item: {},
          device: {name: device.name, value: 'Down'}
        });
        if (display) {
          switch (device.type) {
            case "baikal-miner":
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                stats.entries[device.group][device.id] = {
                  type: device.type,
                  name: device.name,
                  devs: {},
                  hostname: device.hostname
                };
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {
                  type: device.type,
                  name: device.name,
                  devs: {},
                  hostname: device.hostname
                };
              }
              break;
            case "miner-agent":
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                  stats.entries[device.group][device.id].type = device.type;
                  stats.entries[device.group][device.id].name = device.name;
                  stats.entries[device.group][device.id].hostname = device.hostname;
                  stats.entries[device.group][device.id].entries = {};
                } else {
                  stats.entries[device.group][device.id] = {
                    type: device.type,
                    name: device.name,
                    entries: {},
                    hostname: device.hostname
                  };
                }
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {
                  type: device.type,
                  name: device.name,
                  entries: {},
                  hostname: device.hostname
                };
              }
              break;
          }
        }
        console.log(colors.red("[" + device.name + "] Error: Unable to get stats data (" + error.code + ")"));
      });
      req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
          req.abort();
        });
      });
      req.end();
      break;
  }
}

function getOhmStats(device, display) {
  if (device.type === 'baikal-miner')
    return 0;
  var arr = device.ohm.split("://");
  var protocol = arr[0];
  arr = arr[1].split(":");
  var path = "/data.json";
  switch (protocol) {
    case "http":
      var req = http.request({
        host: arr[0],
        path: path,
        method: 'GET',
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
            console.log(colors.red("[" + device.name + "] Error: Unable to get ohm stats data"));
          }
          if (parsed != null) {
            var devices = new Array();
            for (var i = 0; i < parsed.Children[0].Children.length; i++) {
              var egliable = false;
              var ohmdevice = {};
              var currDevice = parsed.Children[0].Children[i];
              for (var j = 0; j < currDevice.Children.length; j++) {
                var currHw = currDevice.Children[j];
                if (currHw.Text === 'Temperatures' && currHw.Children[0].Value !== undefined) {
                  egliable = true;
                  ohmdevice.dev = currDevice.Text;
                  ohmdevice.temp = currHw.Children[0].Value;
                }
                if (currHw.Text === 'Controls')
                  ohmdevice.fan = currHw.Children[0].Value;
              }
              if (egliable)
                devices.push(ohmdevice);
            }
            checkResult(devices, device, true);
            if (display) {
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                  stats.entries[device.group][device.id].devices = devices;
                } else {
                  stats.entries[device.group][device.id] = {devices: devices};
                }
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {devices: devices};
              }
            }
          } else {
            if (display) {
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                  stats.entries[device.group][device.id].devices = [];
                } else {
                  stats.entries[device.group][device.id] = {devices: []};
                }
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {devices: []};
              }
            }
          }
        });
      }).on("error", function (error) {
        if (display) {
          if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
            if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
              stats.entries[device.group][device.id].devices = [];
            } else {
              stats.entries[device.group][device.id] = {devices: []};
            }
          else {
            stats.entries[device.group] = {};
            stats.entries[device.group][device.id] = {devices: []};
          }
        }
        console.log(colors.red("[" + device.name + "] Error: Unable to get ohm stats data (" + error.code + ")"));
      });
      req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
          req.abort();
        });
      });
      req.end();
      break;
    case "https":
      var req = https.request({
        host: arr[0],
        path: path,
        method: 'GET',
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
          //console.log(body);
          var parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            console.log(colors.red("[" + device.name + "] Error: Unable to get ohm stats data"));
          }
          if (parsed != null) {
            var devices = new Array();
            for (var i = 0; i < parsed.Children[0].Children.length; i++) {
              var egliable = false;
              var ohmdevice = {};
              var currDevice = parsed.Children[0].Children[i];
              for (var j = 0; j < currDevice.Children.length; j++) {
                var currHw = currDevice.Children[j];
                if (currHw.Text === 'Temperatures' && currHw.Children[0].Value !== undefined) {
                  egliable = true;
                  ohmdevice.dev = currDevice.Text;
                  ohmdevice.temp = currHw.Children[0].Value;
                }
                if (currHw.Text === 'Controls')
                  ohmdevice.fan = currHw.Children[0].Value;
              }
              if (egliable)
                devices.push(ohmdevice);
            }
            checkResult(devices, device, true);
            if (display) {
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                  stats.entries[device.group][device.id].devices = devices;
                } else {
                  stats.entries[device.group][device.id] = {devices: devices};
                }
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {devices: devices};
              }
            }
          } else {
            if (display) {
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
                if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
                  stats.entries[device.group][device.id].devices = [];
                } else {
                  stats.entries[device.group][device.id] = {devices: []};
                }
              else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {devices: []};
              }
            }
          }
        });
      }).on("error", function (error) {
        if (display) {
          if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null)
            if (stats.entries[device.group][device.id] !== undefined && stats.entries[device.group][device.id] !== null) {
              stats.entries[device.group][device.id].devices = [];
            } else {
              stats.entries[device.group][device.id] = {devices: []};
            }
          else {
            stats.entries[device.group] = {};
            stats.entries[device.group][device.id] = {devices: []};
          }
        }
        console.log(colors.red("[" + device.name + "] Error: Unable to get ohm stats data (" + error.code + ")"));
      });
      req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
          req.abort();
        });
      });
      req.end();
      break;
  }
}

function getStorjshareDaemonStats(device, display) {
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

  switch (device.type) {
    case 'storjshare-daemon':
      const sock = dnode.connect(hostname, port);

      sock.on('error', () => {
        console.log(colors.red(`Error: daemon for device ${device.name} not running`));
        counterAndSend({
          type: 'device',
          status: 'Problem',
          descriptor: '',
          item: {},
          device: {name: device.name, value: 'Down'}
        });
        if (display) {
          if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null) {
            stats.entries[device.group][device.id] = {type: device.type, name: device.name};
          } else {
            stats.entries[device.group] = {};
            stats.entries[device.group][device.id] = {type: device.type, name: device.name};
          }
        }
      });

      sock.on('remote', (remote) => {
        remote.status((err, shares) => {
          sock.end();
          processStorjshareShares(device, display, shares);
        });
      });
      break;
    case 'storjshare-daemon-proxy':
      const req = https.request({
        host: hostname,
        path: '/status',
        method: 'POST',
        port,
        auth: user ? `${user}:${pass}` : undefined,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8'
        }
      }, (response) => {
        response.setEncoding('utf8');
        let body = '';
        response.on('data', (d) => {
          body += d;
        });
        response.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch (error) {
            console.log(colors.red("Error: Unable to get storjshareDaemonProxy stats data: " + error.message));
            counterAndSend({
              type: 'device',
              status: 'Problem',
              descriptor: '',
              item: {},
              device: {name: device.name, value: 'Down'}
            });
            if (display) {
              if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null) {
                stats.entries[device.group][device.id] = {type: device.type, name: device.name};
              } else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {type: device.type, name: device.name};
              }
            }
          }
          if (parsed && parsed.data) {
            processStorjshareShares(device, display, parsed.data);
          } else {
            counterAndSend({
              type: 'device',
              status: 'Problem',
              descriptor: '',
              item: {},
              device: {name: device.name, value: 'Down'}
            });
          }
        });
      })
        .on("error", (error) => {
          console.log(colors.red("Error: Unable to get storjshareDaemonProxy stats data (" + error.code + ")"));
          counterAndSend({
            type: 'device',
            status: 'Problem',
            descriptor: '',
            item: {},
            device: {name: device.name, value: 'Down'}
          });
          if (display) {
            if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null) {
              stats.entries[device.group][device.id] = {type: device.type, name: device.name};
            } else {
              stats.entries[device.group] = {};
              stats.entries[device.group][device.id] = {type: device.type, name: device.name};
            }
          }
        });
      req.on('socket', (socket) => {
        socket.setTimeout(20000);
        socket.on('timeout', () => {
          req.abort();
        });
      });
      req.end();
      break;
  }
}

function processStorjshareShares(device, display, shares) {
  counterAndSend({
    type: 'device',
    status: 'OK',
    descriptor: '',
    item: {},
    device: {name: device.name, value: 'Up'}
  });
  shares.sort((a, b) => {
    if (a.config.storagePath < b.config.storagePath) return -1;
    if (a.config.storagePath > b.config.storagePath) return 1;
    return 0;
  });
  let lastSpaceUpdate = null;
  let totalSpaceUsed = 0;
  let totalChange = 0;
  let totalPeers = 0;
  let totalRestarts = 0;
  let avgRt = null;
  let avgTr = null;
  if (stats.entries && stats.entries[device.group] && stats.entries[device.group][device.id]) {
    avgRt = stats.entries[device.group][device.id].avgRt ? stats.entries[device.group][device.id].avgRt : 'N/A';
    avgTr = stats.entries[device.group][device.id].avgTr ? stats.entries[device.group][device.id].avgTr : 'N/A';
  }
  shares.forEach((share, index) => {
    if (stats.entries[device.group] &&
      stats.entries[device.group][device.id] &&
      stats.entries[device.group][device.id].shares &&
      stats.entries[device.group][device.id].shares[index]) {
      lastSpaceUpdate = stats.entries[device.group][device.id].lastSpaceUpdate;
      share.meta.farmerState.lastSpaceUsed = stats.entries[device.group][device.id].shares[index].meta.farmerState.lastSpaceUsed;
      share.tr = stats.entries[device.group][device.id].shares[index].tr;
      share.rt = stats.entries[device.group][device.id].shares[index].rt;
      if (share.meta.farmerState.spaceUsedBytes) {
        // init
        if (!lastSpaceUpdate) {
          lastSpaceUpdate = Date.now();
          share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes;
        }
        if ((Date.now() - lastSpaceUpdate) / 1000 > 60 * 60 * 12) {
          // we need to save the current space used
          lastSpaceUpdate = Date.now();
          share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes;
        }
        // calculate diff
        const change = share.meta.farmerState.spaceUsedBytes - share.meta.farmerState.lastSpaceUsed;
        if (change < 0) {
          share.meta.farmerState.change = `- ${bytes(-1 * change)}`;
        } else {
          share.meta.farmerState.change = `+ ${bytes(change)}`;
        }
        totalChange += change;
        totalSpaceUsed += share.meta.farmerState.spaceUsedBytes;
        totalPeers += share.meta.farmerState.totalPeers;
        totalRestarts += share.meta.numRestarts;
      }
    }
    share.meta.farmerState.lastActivity = (Date.now() - share.meta.farmerState.lastActivity) / 1000;
  });
  const avgPeers = totalPeers / shares.length;
  if (totalChange < 0) {
    totalChange = `- ${bytes(-1 * totalChange)}`;
  } else {
    totalChange = `+ ${bytes(totalChange)}`;
  }
  totalSpaceUsed = bytes(totalSpaceUsed);
  const obj = {
    shares,
    type: device.type,
    name: device.name,
    lastSpaceUpdate,
    avgPeers,
    totalChange,
    totalSpaceUsed,
    avgRt,
    avgTr,
    totalRestarts
  };
  if (display) {
    if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null) {
      stats.entries[device.group][device.id] = obj;
    } else {
      stats.entries[device.group] = {};
      stats.entries[device.group][device.id] = obj;
    }
  }
}

function getStorjshareBridgeApiStats() {
  Object.keys(stats.entries).forEach((groupName) => {
    const group = stats.entries[groupName];
    Object.keys(group).forEach((entryId) => {
      const entry = group[entryId];
      if ((entry.type === 'storjshare-daemon' || entry.type === 'storjshare-daemon-proxy') && entry.shares) {
        let avgRt = 0;
        let avgTr = 0;
        let counter1 = 0;
        let counter2 = 0;
        entry.shares.forEach((share) => {
          if (share.id) {
            ((share) => {
              const req = https.request({
                host: 'api.storj.io',
                path: `/contacts/${share.id}`,
                method: 'GET',
                port: 443,
                rejectUnauthorized: false,
                headers: {
                  'Content-Type': 'application/json;charset=UTF-8'
                }
              }, (response) => {
                response.setEncoding('utf8');
                let body = '';
                response.on('data', (d) => {
                  body += d;
                });
                response.on('end', () => {
                  let parsed = null;
                  try {
                    parsed = JSON.parse(body);
                  } catch (error) {
                    console.log(colors.red("Error: Unable to get storjshareBridgeApi stats data: " + error.message));
                  }
                  if (parsed) {
                    if (parsed.responseTime !== undefined) {
                      share.rt = parsed.responseTime > 1000 ? `${(parsed.responseTime / 1000).toFixed(2)} s` : `${parsed.responseTime.toFixed(0)} ms`;
                      avgRt += parsed.responseTime;
                      counter1 += 1;
                    } else {
                      share.rt = 'N/A';
                    }
                    if (parsed.timeoutRate !== undefined) {
                      share.tr = `${(parsed.timeoutRate * 100).toFixed(2)} %`;
                    } else {
                      share.tr = '0.00 %';
                    }
                    avgTr += parsed.timeoutRate ? parsed.timeoutRate : 0;
                    counter2 += 1;
                  }
                });
              })
                .on("error", (error) => {
                  console.log(colors.red("Error: Unable to get storjshareBridgeApi stats data (" + error.code + ")"));
                });
              req.on('socket', (socket) => {
                socket.setTimeout(20000);
                socket.on('timeout', () => {
                  req.abort();
                });
              });
              req.end();
            })(share);
          }
        });
        ((groupName, entryId) => {
          setTimeout(() => {
            avgRt = avgRt / (counter1 ? counter1 : 1);
            avgTr = avgTr / (counter2 ? counter2 : 1);
            stats.entries[groupName][entryId].avgRt = avgRt > 1000 ? `${(avgRt / 1000).toFixed(2)} s` : `${avgRt.toFixed(0)} ms`;
            stats.entries[groupName][entryId].avgTr = `${(avgTr * 100).toFixed(2)} %`;
          }, 30 * 1000);
        })(groupName, entryId);
      }
    });
  });
}


// #########################
// #####     Pools     #####
// #########################

async function getAllNicehashStats() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'nicehash' && dashboard.enabled) {
      let poolData = null;
      try {
        poolData = await nicehash(dashboard.address, exchangeRates);
      } catch (error) {
        console.log(`${dashboard.name}: ${error.message}`);
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

async function getAllMPHStats() {
  for (let dashboard of configModule.config.dashboardData) {
    if (dashboard.type === 'miningpoolhub' && dashboard.enabled) {
      let poolData = null;
      try {
        poolData = await mph(dashboard.address, dashboard.api_key, dashboard.user_id);
      } catch (error) {
        console.log(`${dashboard.name}: ${error.message}`);
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
        console.log(`${dashboard.name}: ${error.message}`);
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
        console.log(error);
      }
      stats.dashboardData[dashboard.id] = {
        name: dashboard.name,
        type: dashboard.type,
        enabled: dashboard.enabled,
        data: balanceData,
      };
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
        console.log(error);
      }
      stats.dashboardData[dashboard.id] = {
        name: dashboard.name,
        type: dashboard.type,
        enabled: dashboard.enabled,
        data: balanceData,
        ticker: dashboard.ticker.toUpperCase(),
      };
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
      stats.dashboardData[dashboard.id] = {
        name: dashboard.name,
        type: dashboard.type,
        enabled: dashboard.enabled,
        data: balanceData,
      };
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
        console.log(error);
      }
      stats.dashboardData[dashboard.id] = {
        name: dashboard.name,
        type: dashboard.type,
        enabled: dashboard.enabled,
        data: balanceData,
      };
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
  initAllMinerStats();
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
  getStorjshareBridgeApiStats();
  getAllEthStats();
  mphInterval = setInterval(getAllMPHStats, 1 * 60 * 1000);
  nhinterval = setInterval(getAllNicehashStats, 20000);
  btcBalanceInterval = setInterval(getAllBitcoinbalances, 3 * 60 * 1000);
  mposInterval = setInterval(getAllMPOSStats, 30000);
  setInterval(updateExchangeRates, 3 * 60 * 1000);
  setInterval(getAllCryptoidBalances, 3 * 60 * 1000);
  setInterval(getAllCounterpartyBalances, 3 * 60 * 1000);
  setInterval(getStorjshareBridgeApiStats, 3 * 60 * 1000);
  setInterval(getAllEthStats, 3 * 60 * 1000);
}

setTimeout(init, 2000);

exports.getStats = getStats;
exports.restartInterval = restartInterval;
exports.cleanup = cleanup;
