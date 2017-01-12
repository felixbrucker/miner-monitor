'use strict';

const https = require('https');
const http = require('http');
var fs = require('fs');
var path = require('path');
var colors = require('colors/safe');


var configModule = require(__basedir + 'api/modules/configModule');

var stats = {
  entries:{},
  nicehash:{},
  bitcoinBalances:{}
};

var interval=null;
var nhinterval=null;
var btcBalanceInterval=null;

function getStats(req, res, next) {
  var entries=[];
  Object.keys(stats.entries).forEach(function(key,index) {
    var arr=Object.keys(stats.entries[key]).map(function (key2) { return stats.entries[key][key2]; });
    entries.push({name:key,devices:arr});
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({entries:entries,nicehash:{addr:configModule.config.nicehashAddr,stats:stats.nicehash},bitcoinBalances:stats.bitcoinBalances}));
}


function getMinerStats(device) {
  var arr = device.hostname.split("://");
  var protocol=arr[0];
  arr = arr[1].split(":");
  var path="";
  switch(device.type){
    case "baikal-miner":
      path="/f_status.php?all=1";
      break;
    case "miner-agent":
      path="/api/mining/stats";
      break;
  }
  switch(protocol){
    case "http":
      var req= http.request({
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
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
          }
          if (parsed != null){
            switch(device.type){
              case "baikal-miner":
                if (parsed.status!==false){
                  parsed.status.type=device.type;
                  parsed.status.name=device.name;
                  parsed.status.hostname=device.hostname;
                  if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                    stats.entries[device.group][device.id]=parsed.status;
                  else{
                    stats.entries[device.group]={};
                    stats.entries[device.group][device.id]=parsed.status;
                  }
                }
                break;
              case "miner-agent":
                if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                  if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                    stats.entries[device.group][device.id].type = device.type;
                    stats.entries[device.group][device.id].name = device.name;
                    stats.entries[device.group][device.id].hostname = device.hostname;
                    stats.entries[device.group][device.id].entries = parsed.entries;
                  }else{
                    stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:parsed.entries,hostname:device.hostname};
                  }
                else{
                  stats.entries[device.group]={};
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:parsed.entries,hostname:device.hostname};
                }
                break;
            }
          }else{
            switch(device.type){
              case "baikal-miner":
                if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
                else{
                  stats.entries[device.group]={};
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
                }
                break;
              case "miner-agent":
                if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                  if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                    stats.entries[device.group][device.id].type = device.type;
                    stats.entries[device.group][device.id].name = device.name;
                    stats.entries[device.group][device.id].hostname = device.hostname;
                    stats.entries[device.group][device.id].entries = {};
                  }else{
                    stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
                  }
                else{
                  stats.entries[device.group]={};
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
                }
                break;
            }
          }
        });
      }).on("error", function(error) {
        switch(device.type){
          case "baikal-miner":
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
            }
            break;
          case "miner-agent":
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                stats.entries[device.group][device.id].type = device.type;
                stats.entries[device.group][device.id].name = device.name;
                stats.entries[device.group][device.id].hostname = device.hostname;
                stats.entries[device.group][device.id].entries = {};
              }else{
                stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
              }
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
            }
            break;
        }
        console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
        console.log(error);
      });
      req.end();
      break;
    case "https":
      var req= https.request({
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
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
          }
          if (parsed != null){
            switch(device.type){
              case "baikal-miner":
                if (parsed.status!==false){
                  parsed.status.type=device.type;
                  parsed.status.name=device.name;
                  parsed.status.hostname=device.hostname;
                  if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                    stats.entries[device.group][device.id]=parsed.status;
                  else{
                    stats.entries[device.group]={};
                    stats.entries[device.group][device.id]=parsed.status;
                  }
                }
                break;
              case "miner-agent":
                if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                  if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                    stats.entries[device.group][device.id].type = device.type;
                    stats.entries[device.group][device.id].name = device.name;
                    stats.entries[device.group][device.id].hostname = device.hostname;
                    stats.entries[device.group][device.id].entries = parsed.entries;
                  }else{
                    stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:parsed.entries,hostname:device.hostname};
                  }
                else{
                  stats.entries[device.group]={};
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:parsed.entries,hostname:device.hostname};
                }
                break;
            }
          }else{
            switch(device.type){
              case "baikal-miner":
                if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
                else{
                  stats.entries[device.group]={};
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
                }
                break;
              case "miner-agent":
                if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
                  if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                    stats.entries[device.group][device.id].type = device.type;
                    stats.entries[device.group][device.id].name = device.name;
                    stats.entries[device.group][device.id].hostname = device.hostname;
                    stats.entries[device.group][device.id].entries = {};
                  }else{
                    stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
                  }
                else{
                  stats.entries[device.group]={};
                  stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
                }
                break;
            }
          }
        });
      }).on("error", function(error) {
        switch(device.type){
          case "baikal-miner":
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={type:device.type,name:device.name,devs:{},hostname:device.hostname};
            }
            break;
          case "miner-agent":
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                stats.entries[device.group][device.id].type = device.type;
                stats.entries[device.group][device.id].name = device.name;
                stats.entries[device.group][device.id].hostname = device.hostname;
                stats.entries[device.group][device.id].entries = {};
              }else{
                stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
              }
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={type:device.type,name:device.name,entries:{},hostname:device.hostname};
            }
            break;
        }
        console.log(colors.red("["+device.name+"] Error: Unable to get stats data"));
        console.log(error);
      });
      req.end();
      break;
  }
}

function getOhmStats(device){
  if (device.type==='baikal-miner')
    return 0;
  var arr = device.ohm.split("://");
  var protocol=arr[0];
  arr = arr[1].split(":");
  var path="/data.json";
  switch(protocol){
    case "http":
      var req= http.request({
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
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get ohm stats data"));
          }
          if (parsed != null){
            var devices = new Array();
            for(var i=0;i<parsed.Children[0].Children.length;i++) {
              var egliable = false;
              var ohmdevice = {};
              var currDevice=parsed.Children[0].Children[i];
              for(var j=0;j<currDevice.Children.length;j++) {
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
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                stats.entries[device.group][device.id].devices = devices;
              }else{
                stats.entries[device.group][device.id] = {devices:devices};
              }
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={devices:devices};
            }
          }else{
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                stats.entries[device.group][device.id].devices = [];
              }else{
                stats.entries[device.group][device.id] = {devices:[]};
              }
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={devices:[]};
            }
          }
        });
      }).on("error", function(error) {
        if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
          if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
            stats.entries[device.group][device.id].devices = [];
          }else{
            stats.entries[device.group][device.id] = {devices:[]};
          }
        else{
          stats.entries[device.group]={};
          stats.entries[device.group][device.id]={devices:[]};
        }
        console.log(colors.red("["+device.name+"] Error: Unable to get ohm stats data"));
        console.log(error);
      });
      req.end();
      break;
    case "https":
      var req= https.request({
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
          try{
            parsed=JSON.parse(body);
          }catch(error){
            console.log(colors.red("["+device.name+"] Error: Unable to get ohm stats data"));
          }
          if (parsed != null){
            var devices = new Array();
            for(var i=0;i<parsed.Children[0].Children.length;i++) {
              var egliable = false;
              var ohmdevice = {};
              var currDevice=parsed.Children[0].Children[i];
              for(var j=0;j<currDevice.Children.length;j++) {
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
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                stats.entries[device.group][device.id].devices = devices;
              }else{
                stats.entries[device.group][device.id] = {devices:devices};
              }
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={devices:devices};
            }
          }else{
            if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
              if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
                stats.entries[device.group][device.id].devices = [];
              }else{
                stats.entries[device.group][device.id] = {devices:[]};
              }
            else{
              stats.entries[device.group]={};
              stats.entries[device.group][device.id]={devices:[]};
            }
          }
        });
      }).on("error", function(error) {
        if(stats.entries[device.group]!==undefined&&stats.entries[device.group]!==null)
          if(stats.entries[device.group][device.id]!==undefined&&stats.entries[device.group][device.id]!==null){
            stats.entries[device.group][device.id].devices = [];
          }else{
            stats.entries[device.group][device.id] = {devices:[]};
          }
        else{
          stats.entries[device.group]={};
          stats.entries[device.group][device.id]={devices:[]};
        }
        console.log(colors.red("["+device.name+"] Error: Unable to get ohm stats data"));
        console.log(error);
      });
      req.end();
      break;
  }
}

function getNicehashStats(addr){
  var req= https.request({
    host: 'www.nicehash.com',
    path: '/api?method=stats.provider.ex&addr='+addr,
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
      try{
        parsed=JSON.parse(body);
      }catch(error){
        console.log(colors.red("Error: Unable to get nicehash stats data"));
      }
      if (parsed != null){
        if(parsed.result.error)
          console.log(colors.red("Error: "+parsed.result.error));
        var unpaidBalance=0;
        var profitability=0;
        var current=parsed.result.current;
        var payments=parsed.result.payments;
        for(var i=0;i<current.length;i++){
          var algo=current[i];
          if (algo.data['1'] !== '0') {
            unpaidBalance += parseFloat(algo.data['1']);
            if (algo.data['0'].a !== undefined) {
              profitability += parseFloat(algo.data['0'].a) * parseFloat(algo.profitability);
              getNicehashWorkerStats(addr,algo);
            }
          }
        }
        // ugly
        setTimeout(function(){
          stats.nicehash.sum={profitability:profitability,unpaidBalance:unpaidBalance};
          stats.nicehash.data={current:current,payments:payments};
        },5000);
      }
    });
  }).on("error", function(error) {
    console.log(colors.red("Error: Unable to get nicehash stats data"));
    console.log(error);
  });
  req.end();
}

function getNicehashWorkerStats(addr,algo){
  var req= https.request({
    host: 'www.nicehash.com',
    path: '/api?method=stats.provider.workers&addr='+addr+'&algo='+algo.algo,
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
      try{
        parsed=JSON.parse(body);
      }catch(error){
        console.log(colors.red("Error: Unable to get nicehash worker data"));
      }
      if (parsed != null){
        parsed.result.workers.sort(function(a,b){
          if(a[0]<b[0]) return -1;
          if(a[0]>b[0]) return 1;
          return 0;
        });
        algo.worker = parsed.result.workers;
      }
    });
  }).on("error", function(error) {
    console.log(colors.red("Error: Unable to get nicehash worker data"));
    console.log(error);
  });
  req.end();
}

function getAllBitcoinbalances(){
  if(configModule.config.nicehashAddr!==undefined&&configModule.config.nicehashAddr!==null&&configModule.config.nicehashAddr!=="")
    getBitcoinBalance("Mining",configModule.config.nicehashAddr);
}

function getBitcoinBalance(name,addr){
  var req= https.request({
    host: 'blockchain.info',
    path: '/address/'+addr+'?format=json&limit=0',
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
      try{
        parsed=JSON.parse(body);
      }catch(error){
        console.log(colors.red("Error: Unable to get bitcoin balance data"));
      }
      if (parsed != null){
        if(!parsed['final_balance'])
          console.log(colors.red("Error: "+parsed));
        else
          stats.bitcoinBalances[name]=parsed['final_balance'];
      }
    });
  }).on("error", function(error) {
    console.log(colors.red("Error: Unable to get bitcoin balance data"));
    console.log(error);
  });
  req.end();
}

function getAllMinerStats(){
  for(var i=0;i<configModule.config.groups.length;i++){
    var group=configModule.config.groups[i];
    if(group.enabled){
      for(var j=0;j<configModule.config.devices.length;j++){
        var device=configModule.config.devices[j];
        if(device.enabled&&device.group===group.name){
          getMinerStats(JSON.parse(JSON.stringify(device)));
          if(device.ohm!==undefined&&device.ohm!==null&&device.ohm!=="")
            getOhmStats(JSON.parse(JSON.stringify(device)));
        }
      }
    }
  }
}

function cleanup(){
  stats.entries={};
}

function restartInterval(){
  clearInterval(interval);
  interval=setInterval(getAllMinerStats,configModule.config.interval*1000);
}

function init() {
  getAllMinerStats();
  getNicehashStats(configModule.config.nicehashAddr);
  getAllBitcoinbalances();
  interval=setInterval(getAllMinerStats,configModule.config.interval*1000);
  nhinterval=setInterval(getNicehashStats,20000,configModule.config.nicehashAddr);
  btcBalanceInterval=setInterval(getAllBitcoinbalances,60000);
}

setTimeout(init, 2000);

exports.getStats = getStats;
exports.restartInterval = restartInterval;
exports.cleanup = cleanup;