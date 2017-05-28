const axios = require('axios');
const dnode = require('dnode');
const https = require('https');

async function getStorjshareDaemonStats(hostname, port) {
  const sock = dnode.connect(hostname, port);

  return new Promise((resolve, reject) => {
    sock.on('error', () => {
      reject(`Error: daemon for device ${device.name} not running`);
    });

    sock.on('remote', (remote) => {
      remote.status((err, shares) => {
        sock.end();
        shares.sort((a, b) => {
          if (a.config.storagePath < b.config.storagePath) return -1;
          if (a.config.storagePath > b.config.storagePath) return 1;
          return 0;
        });
        shares.forEach((share) => {
          share.meta.farmerState.lastActivity = (Date.now() - share.meta.farmerState.lastActivity) / 1000;
        });
        resolve(shares);
      });
    });
  });
}
async function getStorjshareDaemonProxyStats(hostname) {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  let storjshareData = await axios.post(`${hostname}/status`, null, {httpsAgent: agent});
  storjshareData = storjshareData.data.data;
  storjshareData.sort((a, b) => {
    if (a.config.storagePath < b.config.storagePath) return -1;
    if (a.config.storagePath > b.config.storagePath) return 1;
    return 0;
  });
  storjshareData.forEach((share) => {
    share.meta.farmerState.lastActivity = (Date.now() - share.meta.farmerState.lastActivity) / 1000;
  });
  return storjshareData;
}

async function getBridgeStats(id) {
  const bridgeStats = await axios.get(`https://api.storj.io/contacts/${id}`);
  return bridgeStats.data;
}

module.exports = {
  getStorjshareDaemonStats,
  getStorjshareDaemonProxyStats,
  getBridgeStats,
};
