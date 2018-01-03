const nodemailer = require('nodemailer');
const config = require('../../modules/configModule');

let transport = null;

function onInit() {
  createTransport();
}

function createTransport() {
  transport = nodemailer.createTransport(config.config.mailConfig || {});
}

async function sendMail(options) {
  let result = null;
  try {
    result = await transport.sendMail(options);
  } catch(err) {
    console.error(`[Mail] Sending mail failed: ${err.message}`);
  }

  return result;
}

async function verifyTransport(){
  let status = null;
  try {
    status = await transport.verify();
  } catch(err) {
    console.error(`[Mail] SMTP Connection Verification failed: ${err.message}`);
    return false;
  }
  // TODO: use status?
  return true;
}

onInit();

module.exports = {
  sendMail,
  verifyTransport,
  createTransport,
};