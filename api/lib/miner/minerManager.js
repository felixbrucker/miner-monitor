const https = require('https');
const axios = require('axios');

module.exports = async (device) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const minerData = await axios.get(`${device.hostname}/api/mining/stats`, null, {httpsAgent: agent});
  return {
    type: device.type,
    name: device.name,
    entries: minerData.data.entries,
    hostname: device.hostname
  };
};
