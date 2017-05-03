const https = require('https');
const http = require('http');
const getExchangeRates = require("get-exchange-rates");
var fs = require('fs');
var path = require('path');
var colors = require('colors/safe');
const Rx = require('rx');
const dnode = require('dnode');
const bytes = require('bytes');


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
    Object.keys(stats.entries).forEach(function (key, index) {
        var arr = Object.keys(stats.entries[key]).map(function (key2) {
            return stats.entries[key][key2];
        });
        entries.push({name: key, devices: arr});
    });
    var dashboardData = [];
    Object.keys(stats.dashboardData).forEach(function (key, index) {
        let dashboard = {
            name: key,
            enabled: stats.dashboardData[key].enabled,
            data: stats.dashboardData[key].data,
            type: stats.dashboardData[key].type
        };
        if (stats.dashboardData[key].ticker) {
            dashboard.ticker = stats.dashboardData[key].ticker;
        }
        dashboardData.push(dashboard);
    });
    dashboardData.sort(function (a, b) {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({entries: entries, dashboardData: dashboardData}));
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
                            item: {name: 'miners', value: Object.keys(result.entries).length, highLow: 'low'},
                            device: {name: device.name, value: 'Up'}
                        };
                    } else {
                        obj = {
                            type: 'item',
                            status: 'OK',
                            descriptor: 'Number',
                            item: {name: 'miners', value: Object.keys(result.entries).length, highLow: 'low'},
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

function getAllNicehashStats() {
    for (var i = 0; i < configModule.config.dashboardData.length; i++) {
        if (configModule.config.dashboardData[i].type === 'nicehash' && configModule.config.dashboardData[i].enabled) {
            getNicehashStats(configModule.config.dashboardData[i]);
        }
    }
}

function getNicehashStats(obj) {

    var req = https.request({
        host: 'www.nicehash.com',
        path: '/api?method=stats.provider.ex&addr=' + obj.address,
        method: 'GET',
        port: 443,
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
                console.log(colors.red("Error: Unable to get nicehash stats data"));
            }
            if (parsed != null) {
                if (parsed.result.error)
                    console.log(colors.red("Error: " + parsed.result.error));
                else {
                    var unpaidBalance = 0;
                    var profitability = 0;
                    var current = parsed.result.current;
                    var payments = parsed.result.payments;
                    for (var i = 0; i < current.length; i++) {
                        var algo = current[i];
                        if (algo.data['1'] !== '0') {
                            unpaidBalance += parseFloat(algo.data['1']);
                            if (algo.data['0'].a !== undefined) {
                                profitability += parseFloat(algo.data['0'].a) * parseFloat(algo.profitability);
                                getNicehashWorkerStats(obj.address, algo);
                            }
                        }
                    }
                    // ugly
                    setTimeout(function () {
                        stats.dashboardData[obj.name] = {
                            data: {
                                sum: {
                                    profitability: profitability,
                                    unpaidBalance: unpaidBalance,
                                    profitabilityEur: profitability * exchangeRates.eurPerBTC,
                                    unpaidBalanceEur: unpaidBalance * exchangeRates.eurPerBTC,
                                },
                                current: current,
                                payments: payments,
                                address: obj.address
                            },
                            enabled: obj.enabled,
                            type: obj.type
                        };
                    }, 5000);
                }
            }
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get nicehash stats data (" + error.code + ")"));
    });
    req.on('socket', function (socket) {
        socket.setTimeout(20000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getNicehashWorkerStats(addr, algo) {
    var req = https.request({
        host: 'www.nicehash.com',
        path: '/api?method=stats.provider.workers&addr=' + addr + '&algo=' + algo.algo,
        method: 'GET',
        port: 443,
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
                console.log(colors.red("Error: Unable to get nicehash worker data"));
            }
            if (parsed != null) {
                parsed.result.workers.sort(function (a, b) {
                    if (a[0] < b[0]) return -1;
                    if (a[0] > b[0]) return 1;
                    return 0;
                });
                var workers = [];
                for (var i = 0; i < parsed.result.workers.length; i++) {
                    if (parsed.result.workers[i][0] !== "" && parsed.result.workers[i][1] !== {})
                        workers.push(parsed.result.workers[i]);
                }
                algo.worker = workers;
            }
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get nicehash worker data (" + error.code + ")"));
    });
    req.on('socket', function (socket) {
        socket.setTimeout(20000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getAllBitcoinbalances() {
    for (var i = 0; i < configModule.config.dashboardData.length; i++) {
        if (configModule.config.dashboardData[i].type === 'bitcoinBalance' && configModule.config.dashboardData[i].enabled) {
            getBitcoinBalance(configModule.config.dashboardData[i]);
        }
    }
}

function getMPHWorkerStats(obj, coinName, callback) {
    var req = https.request({
        host: coinName + '.miningpoolhub.com',
        path: '/index.php?page=api&action=getuserworkers&api_key=' + obj.api_key + '&id=' + obj.user_id,
        method: 'GET',
        port: 443,
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
                console.log(colors.red("Error: Unable to get mph worker stats data"));
            }
            if (parsed != null && parsed.getuserworkers) {
                callback(parsed.getuserworkers.data);
            } else {
                callback(null);
            }
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get mph worker stats data (" + error.code + ")"));
        callback(null);
    });
    req.on('socket', function (socket) {
        socket.setTimeout(20000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getMPHCoinStats(obj, coinName, callback) {
    var req = https.request({
        host: coinName + '.miningpoolhub.com',
        path: '/index.php?page=api&action=getdashboarddata&api_key=' + obj.api_key + '&id=' + obj.user_id,
        method: 'GET',
        port: 443,
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
                console.log(colors.red("Error: Unable to get mph coin stats data"));
            }
            if (parsed != null && parsed.getdashboarddata) {
                callback(parsed.getdashboarddata.data);
            } else {
                callback(null);
            }
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get mph coin stats data (" + error.code + ")"));
        callback(null);
    });
    req.on('socket', function (socket) {
        socket.setTimeout(20000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getAllMPHStats() {
    for (var i = 0; i < configModule.config.dashboardData.length; i++) {
        if (configModule.config.dashboardData[i].type === 'miningpoolhub' && configModule.config.dashboardData[i].enabled) {
            getMPHStats(configModule.config.dashboardData[i]);
        }
    }
}

function getMPHStats(obj) {
    var statsData = [];
    var req = https.request({
        host: 'miningpoolhub.com',
        path: '/index.php?page=api&action=getminingandprofitsstatistics',
        method: 'GET',
        port: 443,
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
                console.log(colors.red("Error: Unable to get mph stats data"));
            }
            if (parsed != null && parsed.success) {
                const coinArr = [];
                for (var i = 0; i < parsed.return.length; i++) {
                    coinArr.push(parsed.return[i]);
                }
                const coinEvents = Rx.Observable
                    .fromArray(coinArr);

                Rx.Observable.zip(timeEvents, coinEvents, (i, coin) => coin)
                    .subscribe(coin => {
                        getMPHCoinStats(obj, coin.coin_name, function (result) {
                            if (result !== null) {
                                var data = {
                                    name: coin.coin_name.charAt(0).toUpperCase() + coin.coin_name.slice(1),
                                    profitability: coin.profit / 1000000.0, //make gh/s->kh/s for easier calculation
                                    balance: result.balance,
                                    balance_ae: result.balance_for_auto_exchange,
                                    onExchange: result.balance_on_exchange,
                                    workers: [],
                                    hashrate: result.raw.personal.hashrate, //kh/s
                                    symbol: result.pool.info.currency
                                };

                                (function (data) {
                                    getMPHWorkerStats(obj, coin.coin_name, function (result) {
                                        if (result !== null) {
                                            for (var j = 0; j < result.length; j++) {
                                                if (result[j].hashrate !== 0) {
                                                    var arr = result[j].username.split(".");
                                                    result[j].username = arr[(arr.length === 1 ? 0 : 1)];
                                                    data.workers.push(result[j]);
                                                }
                                            }
                                            statsData.push(data);
                                        }
                                    });
                                })(data);
                            }
                        });
                    }, err => {
                        console.log(err);
                    }, () => {
                        setTimeout(() => {
                            stats.dashboardData[obj.name] = {data: statsData, type: obj.type, enabled: obj.enabled};
                        }, 3000);
                    });
            }
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get mph stats data (" + error.code + ")"));
    });
    req.on('socket', function (socket) {
        socket.setTimeout(20000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getBitcoinBalance(obj) {
    var req = https.request({
        host: 'blockchain.info',
        path: '/address/' + obj.address + '?format=json&limit=0',
        method: 'GET',
        port: 443,
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
                console.log(colors.red("Error: Unable to get bitcoin balance data"));
            }
            if (parsed != null) {
                if (parsed['final_balance'] === undefined)
                    console.log(colors.red("Error: " + JSON.stringify(parsed, null, 2)));
                else
                    stats.dashboardData[obj.name] = {
                        type: obj.type,
                        data: parsed['final_balance'],
                        enabled: obj.enabled
                    };
            }
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get bitcoin balance data (" + error.code + ")"));
    });
    req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getAllCryptoidBalances() {
    for (var i = 0; i < configModule.config.dashboardData.length; i++) {
        if (configModule.config.dashboardData[i].type === 'cryptoidBalance' && configModule.config.dashboardData[i].enabled) {
            getCryptoidBalance(configModule.config.dashboardData[i]);
        }
    }
}

function getCryptoidBalance(obj) {
    var req = https.request({
        host: 'chainz.cryptoid.info',
        path: `/${obj.ticker}/api.dws?q=getbalance&a=${obj.address}${obj.api_key ? '&key=' + obj.api_key : ''}`,
        method: 'GET',
        port: 443,
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
            stats.dashboardData[obj.name] = {
                type: obj.type,
                data: parseFloat(body),
                enabled: obj.enabled,
                ticker: obj.ticker.toUpperCase()
            };
        });
    }).on("error", function (error) {
        console.log(colors.red("Error: Unable to get cryptoid balance data (" + error.code + ")"));
    });
    req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getAllMPOSStats() {
    for (var i = 0; i < configModule.config.dashboardData.length; i++) {
        if (configModule.config.dashboardData[i].type === 'genericMPOS' && configModule.config.dashboardData[i].enabled) {
            getMPOSStats(configModule.config.dashboardData[i]);
        }
    }
}

function getAllCounterpartyBalances() {
    for (var i = 0; i < configModule.config.dashboardData.length; i++) {
        if (configModule.config.dashboardData[i].type === 'counterpartyBalance' && configModule.config.dashboardData[i].enabled) {
            getCounterpartyBalance(configModule.config.dashboardData[i]);
        }
    }
}

function getCounterpartyBalance(obj) {
    var req = https.request({
        host: 'counterpartychain.io',
        path: `/api/balances/${obj.address}`,
        method: 'GET',
        port: 443,
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
            let parsed = null;
            try {
                parsed = JSON.parse(body);
            } catch (error) {
                console.log(colors.red("Error: Unable to get counterparty balance data"));
            }
            if (parsed) {
                stats.dashboardData[obj.name] = {type: obj.type, data: parsed.data, enabled: obj.enabled};
            }
        });
    }).on("error", function (error) {
        console.log(colors.red(`Error: Unable to get counterparty balance data (${error.code})`));
    });
    req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getMPOSMethodData(obj, method, callback) {
    var arr = obj.baseUrl.split("://");
    var protocol = arr[0];
    var url = arr[1];
    arr = arr[1].split(":");
    var req = null;
    switch (protocol) {
        case "https":
            req = https.request({
                host: url,
                path: '/index.php?page=api&action=' + method + '&api_key=' + obj.api_key + '&id=' + obj.user_id,
                method: 'GET',
                port: (arr.length === 1 ? 443 : arr[1]),
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
                        console.log(colors.red("Error: Unable to get MPOS " + method + " stats data"));
                    }
                    if (parsed != null && parsed[method]) {
                        callback(parsed[method].data);
                    } else {
                        callback(null);
                    }
                });
            });
            break;
        case "http":
            req = https.request({
                host: url,
                path: '/index.php?page=api&action=getdashboarddata&api_key=' + obj.api_key + '&id=' + obj.user_id,
                method: 'GET',
                port: (arr.length === 1 ? 80 : arr[1]),
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
                        console.log(colors.red("Error: Unable to get MPOS " + method + " stats data"));
                    }
                    if (parsed != null && parsed[method]) {
                        callback(parsed[method].data);
                    } else {
                        callback(null);
                    }
                });
            });
            break;
    }
    req.on("error", function (error) {
        console.log(colors.red("Error: Unable to get MPOS " + method + " stats data (" + error.code + ")"));
        callback(null);
    });
    req.on('socket', function (socket) {
        socket.setTimeout(20000);
        socket.on('timeout', function () {
            req.abort();
        });
    });
    req.end();
}

function getMPOSStats(obj) {

    if (stats.dashboardData[obj.name] === undefined)
        stats.dashboardData[obj.name] = {type: obj.type, enabled: obj.enabled, data: {baseUrl: obj.baseUrl}};

    getMPOSMethodData(obj, "getdashboarddata", function (result) {
        if (result !== null) {
            stats.dashboardData[obj.name].data.hashrate = result.raw.personal.hashrate / obj.hrModifier;
            stats.dashboardData[obj.name].data.symbol = result.pool.info.currency;
            stats.dashboardData[obj.name].data.estimated = result.personal.estimates.payout;
        }
    });

    getMPOSMethodData(obj, "getuserworkers", function (result) {
        if (result !== null) {
            var workers = [];
            result.sort(function (a, b) {
                if (a.username < b.username) return -1;
                if (a.username > b.username) return 1;
                return 0;
            });
            for (var j = 0; j < result.length; j++) {
                if (result[j].hashrate !== 0) {
                    var arr = result[j].username.split(".");
                    result[j].username = arr[(arr.length === 1 ? 0 : 1)];
                    result[j].hashrate = result[j].hashrate / obj.hrModifier;
                    workers.push(result[j]);
                }
            }
            stats.dashboardData[obj.name].data.workers = workers;
        }
    });

    getMPOSMethodData(obj, "getuserbalance", function (result) {
        if (result !== null) {
            stats.dashboardData[obj.name].data.confirmed = result.confirmed;
            stats.dashboardData[obj.name].data.unconfirmed = result.unconfirmed;
        }
    });
}

function getStorjshareDaemonStats(device, display) {
    let arr = device.hostname.split("://");
    arr = arr[arr.length === 1 ? 0 : 1];
    arr = arr.split(":");
    const hostname = arr[0];
    const port = arr[1];

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
                stats.entries[device.group][device.id] = {type: device.type, name:device.name};
            } else {
                stats.entries[device.group] = {};
                stats.entries[device.group][device.id] = {type: device.type, name:device.name};
            }
        }
    });

    sock.on('remote', (remote) => {
        remote.status((err, shares) => {
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
            shares.forEach((share, index) => {
                if (stats.entries[device.group] &&
                    stats.entries[device.group][device.id] &&
                    stats.entries[device.group][device.id].shares &&
                    stats.entries[device.group][device.id].shares[index]) {
                    lastSpaceUpdate = stats.entries[device.group][device.id].lastSpaceUpdate;
                    share.meta.farmerState.lastSpaceUsed = stats.entries[device.group][device.id].shares[index].meta.farmerState.lastSpaceUsed;
                    // init
                    if (!lastSpaceUpdate) {
                        lastSpaceUpdate = Date.now();
                        share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes;
                    }
                    if ((Date.now() - lastSpaceUpdate)/1000 > 60 * 60 * 12 ) {
                        // we need to save the current space used
                        lastSpaceUpdate = Date.now();
                        share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes;
                    }
                    // calculate diff
                    const change = share.meta.farmerState.spaceUsedBytes - share.meta.farmerState.lastSpaceUsed;
                    if (change < 0) {
                        share.meta.farmerState.change = `- ${bytes(change)}`;
                    } else {
                        share.meta.farmerState.change = `+ ${bytes(change)}`;
                    }
                }
                share.meta.farmerState.lastActivity = (Date.now() - share.meta.farmerState.lastActivity) / 1000;
            });

            const obj = {shares, type: device.type, name: device.name, lastSpaceUpdate};
            if (display) {
                if (stats.entries[device.group] !== undefined && stats.entries[device.group] !== null) {
                    stats.entries[device.group][device.id] = obj;
                } else {
                    stats.entries[device.group] = {};
                    stats.entries[device.group][device.id] = obj;
                }
            }
            sock.end();
        });
    });
}

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
                        if (device.type === 'storjshare-daemon') {
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
                            if (device.type === 'storjshare-daemon') {
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
    mphInterval = setInterval(getAllMPHStats, 30000);
    nhinterval = setInterval(getAllNicehashStats, 20000);
    btcBalanceInterval = setInterval(getAllBitcoinbalances, 3 * 60 * 1000);
    mposInterval = setInterval(getAllMPOSStats, 30000);
    setInterval(updateExchangeRates, 3 * 60 * 1000);
    setInterval(getAllCryptoidBalances, 3 * 60 * 1000);
    setInterval(getAllCounterpartyBalances, 3 * 60 * 1000);
}

setTimeout(init, 2000);

exports.getStats = getStats;
exports.restartInterval = restartInterval;
exports.cleanup = cleanup;
