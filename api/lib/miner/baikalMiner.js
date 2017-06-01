const https = require('https');
const axios = require('axios');

module.exports = async (device) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  let minerData = await axios.get(`${device.hostname}/f_status.php?all=1`, {httpsAgent: agent});
  minerData = minerData.data.status;
  minerData.type = device.type;
  minerData.name = device.name;
  minerData.hostname = device.hostname;
  return minerData;
};
