const https = require('https');
const axios = require('axios');

module.exports = async (device) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const ohmData = await axios.get(`${device.ohm}/data.json`, {httpsAgent: agent});
  const devices = [];
  ohmData.data.Children[0].Children.forEach((device) => {
    let egliable = false;
    const ohmdevice = {};
    device.Children.forEach((currHw) => {
      if (currHw.Text === 'Temperatures' && currHw.Children[0].Value !== undefined) {
        egliable = true;
        ohmdevice.dev = currDevice.Text;
        ohmdevice.temp = currHw.Children[0].Value;
      }
      if (currHw.Text === 'Controls')
        ohmdevice.fan = currHw.Children[0].Value;
    });
    if (egliable) {
      devices.push(ohmdevice);
    }
  });
  return {devices};
};
