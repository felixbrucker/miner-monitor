'use strict';

var express = require('express');

module.exports = function(app) {
  var router = express.Router();

  var configController = require(__basedir + 'api/controllers/configController');
  var statsController = require(__basedir + 'api/controllers/statsController');

  router.get('/config', configController.getConfig);
  router.post('/config', configController.setConfig);
  router.get('/config/layout', configController.getLayout);
  router.get('/config/verifyTransport', configController.verifyTransport);
  router.post('/config/update', configController.update);
  router.post('/config/updateMiner', configController.updateMiner);
  router.post('/config/updateAgent', configController.updateAgent);
  router.post('/config/rebootSystem', configController.rebootSystem);

  router.get('/mining/stats', statsController.getStats);

  app.use('/api', router);
};
