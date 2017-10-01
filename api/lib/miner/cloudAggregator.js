const https = require('https');
const axios = require('axios');

module.exports = async (device) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const minerData = await axios.get(`${device.hostname}/api/mining/stats`, {httpsAgent: agent});
  return {
    type: device.type,
    name: device.name,
    stats: minerData.data,
    hostname: device.hostname
  };
};
