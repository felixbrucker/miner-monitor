const moment = require('moment');
const config = require('../../modules/configModule');
const mailService = require('./mail-service');

const problems = {};

function onInit() {

}

function constructMailOptions(problem) {
  let subject = '';
  let plainTextBody = '';
  switch(problem.type){
    case 'item':
      subject = `${problem.status}: ${problem.descriptor} of ${problem.item.name} on ${problem.device.name} is too ${problem.item.highLow}`;
      plainTextBody=`Trigger: ${problem.descriptor} of ${problem.item.name} on ${problem.device.name} is too ${problem.item.highLow}\n` +
        `Status: ${problem.status}\n` +
        `Item Value: ${problem.item.value}\n` +
        `Event time: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
        `URL: ${problem.device.hostname}`;
      break;
    case 'device':
      subject = `${problem.status}: ${problem.device.name} is unreachable`;
      plainTextBody=`Trigger: ${problem.device.name} is unreachable\n` +
        `Status: ${problem.status}\n` +
        `Item Value: ${problem.text}\n` +
        `Event time: ${moment().format('YYYY-MM-DD HH:mm:ss')}`;
      break;
  }
  // setup e-mail data with unicode symbols
  return {
    from: config.config.mailConfig.auth.user, // sender address
    to: config.config.mailTo, // list of receivers
    subject: subject, // Subject line
    text: plainTextBody // plaintext body
  };
}

function detectChanges(oldEventObject, newEventObject, problem) {
  let sendMail = false;
  if (oldEventObject.offlineCounter >= 6 && newEventObject.offlineCounter === 0) {
    // online again
    sendMail = true;
  }

  if (oldEventObject.offlineCounter === 5 && newEventObject.offlineCounter === 6) {
    // now offline
    sendMail = true;
  }

  if (
    problem.item &&
    oldEventObject.items[problem.item.name] &&
    oldEventObject.items[problem.item.name][problem.descriptor] &&
    oldEventObject.items[problem.item.name][problem.descriptor][problem.item.highLow] >= 6 &&
    newEventObject.items[problem.item.name][problem.descriptor][problem.item.highLow] === 0) {
    // item recovered
    sendMail = true;
  }

  if (
    problem.item &&
    oldEventObject.items[problem.item.name] &&
    oldEventObject.items[problem.item.name][problem.descriptor] &&
    oldEventObject.items[problem.item.name][problem.descriptor][problem.item.highLow] === 5 &&
    newEventObject.items[problem.item.name][problem.descriptor][problem.item.highLow] === 6) {
    // item failed
    sendMail = true;
  }

  return sendMail;
}

function updateEventCounter(problem) {
  const eventObject = problems[problem.device.name];
  switch (problem.type) {
    case 'device':
      if (problem.status === 'Problem') {
        eventObject.offlineCounter += 1;
      } else {
        eventObject.offlineCounter = 0;
      }
      break;
    case 'item':
      if (problem.status === 'Problem') {
        const exists = eventObject.items[problem.item.name];
        if (!exists) {
          createProblemItemTree(problem);
        }
        eventObject.items[problem.item.name][problem.descriptor][problem.item.highLow] += 1;
      } else {
        const exists = eventObject.items[problem.item.name];
        if (!exists) {
          createProblemItemTree(problem);
        }
        eventObject.items[problem.item.name][problem.descriptor][problem.item.highLow] = 0;
      }
      break;
  }
}

function createProblemItemTree(problem) {
  problems[problem.device.name].items[problem.item.name] = {};
  problems[problem.device.name].items[problem.item.name][problem.descriptor] = { low: 0, high: 0 };
}

async function handleProblem(problem) {
  const exists = problems[problem.device.name];
  if (!exists) {
    problems[problem.device.name] = {
      offlineCounter: 0,
      items: {},
    };
  }

  const eventObject = problems[problem.device.name];
  const oldEventObject = JSON.parse(JSON.stringify(eventObject));

  updateEventCounter(problem);
  const shouldSendMail = !problem.device.mailDisabled && detectChanges(oldEventObject, eventObject, problem);
  if (!shouldSendMail) {
    return;
  }

  const result = await mailService.sendMail(constructMailOptions(problem));
  // TODO: use result?
}

onInit();

module.exports = {
  handleProblem,
};
