'use strict';

const express = require('express');

module.exports = function(app) {
  const router = express.Router();

  const configController = require(__basedir + 'api/controllers/configController');
  const statsController = require(__basedir + 'api/controllers/statsController');

  router.get('/config', configController.getConfig);
  router.post('/config', configController.setConfig);
  router.get('/config/layout', configController.getLayout);
  router.get('/config/verifyTransport', configController.verifyTransport);
  router.post('/config/update', configController.update);
  router.post('/config/updateMiner', configController.updateMiner);
  router.post('/config/updateAgent', configController.updateAgent);
  router.post('/config/rebootSystem', configController.rebootSystem);
  router.post('/config/restartShares', configController.restartShares);

  router.get('/mining/stats', statsController.getStats);

  app.use('/api', router);
};
