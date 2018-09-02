'use strict';
global.__basedir = __dirname + '/';
process.title = "miner-monitor";
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const colors = require('colors/safe');
require('console-stamp')(console, {pattern:'yyyy-mm-dd HH:MM:ss',label:false});
const app = express();

app.use(compression());

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

process.on('uncaughtException', err => {
  console.error('uncaughtException', err.stack);
});

process.on('unhandledRejection', err => {
  console.error('unhandledRejection', err.stack);
});
