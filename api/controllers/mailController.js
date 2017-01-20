'use strict';

var colors = require('colors/safe');
var nodemailer = require('nodemailer');


var configModule = require(__basedir + 'api/modules/configModule');

var transporter = null;

String.prototype.padLeft = function (value, size)
{
  var x = this;
  while (x.length < size) {x = value + x;}
  return x;
};

Date.prototype.toFormattedString = function (f) {
  f = f.replace(/yyyy/g, this.getFullYear());
  f = f.replace(/mm/g, String(this.getMonth()+1).padLeft('0',2));
  f = f.replace(/dd/g, String(this.getDate()).padLeft('0',2));
  f = f.replace(/HH/g, String(this.getHours()).padLeft('0',2));
  f = f.replace(/MM/g, String(this.getMinutes()).padLeft('0',2));
  f = f.replace(/SS/g, String(this.getSeconds()).padLeft('0',2));
  return f;
};

function sendMail(problem,callback){
  if(configModule.config.mailTo!==undefined&&configModule.config.mailTo!==null&&configModule.config.mailTo!==""){
    var subject="";
    var plainTextBody="";
    switch(problem.type){
      case "item":
        subject=problem.status+': '+problem.descriptor+' of '+problem.item.name+' on '+problem.device.name+' is too '+problem.item.highLow;
        plainTextBody='Trigger: '+problem.descriptor+' of '+problem.item.name+' on '+problem.device.name+' is too '+problem.item.highLow+'\n' +
          'Status: '+problem.status+'\n'+
          'Item Value: '+problem.item.value+'\n'+
          'Event time: '+(new Date()).toFormattedString('yyyy-mm-dd HH:MM:SS');
        break;
      case "device":
        subject=problem.status+': '+problem.device.name+' is unreachable';
        plainTextBody='Trigger: '+problem.device.name+' is unreachable\n' +
          'Status: '+problem.status+'\n'+
          'Item Value: '+problem.device.value+'\n'+
          'Event time: '+(new Date()).toFormattedString('yyyy-mm-dd HH:MM:SS');
        break;
    }
    // setup e-mail data with unicode symbols
    var mailOptions = {
      from: configModule.config.mailConfig.auth.user, // sender address
      to: configModule.config.mailTo, // list of receivers
      subject: subject, // Subject line
      text: plainTextBody // plaintext body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        return console.log(colors.red('Mail sending failed: '+error));
        callback(false);
      }
      //debug
      //console.log('Message sent: ' + info.response);
      callback(true);
    });
  }else{
    //debug
    //console.log(colors.red('everything is not configured yet to send mails'));
    callback(false);
  }
}

function verifyTransport(callback){
  // verify connection configuration
  transporter.verify(function(error, success) {
    if (error) {
      console.log(colors.red('SMTP Connection Verification failed: '+error));
      callback(false);
    } else {
      //debug
      //console.log('Server is ready to take our messages');
      callback(true);
    }
  });
}

function reloadTransport(){
  if (configModule.config.mailConfig!==undefined&&configModule.config.mailConfig!==null)
    transporter = nodemailer.createTransport(configModule.config.mailConfig);
}

function init() {
  if (configModule.config.mailConfig!==undefined&&configModule.config.mailConfig!==null)
    transporter = nodemailer.createTransport(configModule.config.mailConfig);
}

setTimeout(init,1000);


exports.sendMail = sendMail;
exports.reloadTransport = reloadTransport;
exports.verifyTransport = verifyTransport;
