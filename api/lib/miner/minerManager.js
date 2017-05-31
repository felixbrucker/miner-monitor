const axios = require('axios');

module.exports = async (device) => {
  const minerData = await axios.get(`${device.hostname}/api/mining/stats`);
  return {
    type: device.type,
    name: device.name,
    entries: minerData.data.entries,
    hostname: device.hostname
  };
};
