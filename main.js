'use strict';
global.__basedir = __dirname + '/';
process.title = "miner-monitor";
var express = require('express');
var bodyParser = require('body-parser');
var colors = require('colors/safe');
require('console-stamp')(console, {pattern:'yyyy-mm-dd HH:MM:ss',label:false});
var app = express();

app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb'
}));
app.use(bodyParser.json({
  limit: '50mb'
}));

app.use(express.static(__dirname + '/app'));

require(__basedir + 'api/routes')(app);

// wildcard route to get angular app loaded before angular takes over client-side routing
app.route('*').get(function(req, res) {
  res.sendFile('index.html', {
    root: './'
  });
});

global.listener = app.listen(process.env.PORT || 8085, function(){
  console.log(colors.green('server running on port '+listener.address().port));
});
