const https = require('https');
const axios = require('axios');

module.exports = async (baseUrl) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const minerData = await axios.get(`${baseUrl}/`, {httpsAgent: agent});
  const nodes = minerData.data.data;
  const trainingCount = nodes.filter(node => node.state === 'training').length;
  const keepaliveCount = nodes.filter(node => node.state === 'keepalive').length;
  const graveyardCount = nodes.filter(node => node.state === 'graveyard').length;
  const removedCount = nodes.filter(node => node.state === 'removed').length;
  return {
    training: trainingCount,
    keepalive: keepaliveCount,
    graveyard: graveyardCount,
    removed: removedCount,
    total: nodes.length,
  };
};
