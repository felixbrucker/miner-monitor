const axios = require('axios');

module.exports = async (device) => {
  let minerData = await axios.get(`${device.hostname}/f_status.php?all=1`);
  minerData = minerData.data.status;
  minerData.type = device.type;
  minerData.name = device.name;
  minerData.hostname = device.hostname;
  return minerData;
};
