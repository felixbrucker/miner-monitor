const axios = require('axios');
const dnode = require('dnode');
const https = require('https');
const bytes = require('bytes');

async function getStorjshareDaemonStats(hostname, port) {
  let sock = dnode.connect(hostname, port);

  return new Promise((resolve, reject) => {
    sock.on('error', () => {
      sock.end();
      reject(new Error('daemon not running'));
      sock = null;
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
        sock.removeAllListeners();
        sock = null;
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

function mergeStorjshareStats(stats, storjshareData) {
  if (stats.shares.length !== storjshareData.length) {
    stats.shares = storjshareData;
  }
  const shares = stats.shares;
  const obj = Object.assign({}, stats);
  obj.totalSpaceUsed = 0;
  obj.totalChange = 0;
  obj.totalPeers = 0;
  obj.totalRestarts = 0;
  obj.totalNewContracts = 0;
  shares.forEach((share, index) => {
    storjshareData[index].meta.farmerState = Object.assign(share.meta.farmerState, storjshareData[index].meta.farmerState);
    share = Object.assign(share, storjshareData[index]);
    if (share.meta.farmerState.spaceUsedBytes) {
      // init
      if (!share.lastSpaceUpdate) {
        share.lastSpaceUpdate = Date.now();
        share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes;
      }
      if ((Date.now() - share.lastSpaceUpdate) / 1000 > 60 * 60 * 12) {
        // we need to save the current space used
        share.lastSpaceUpdate = Date.now();
        share.meta.farmerState.lastSpaceUsed = share.meta.farmerState.spaceUsedBytes;
      }
      // calculate diff
      const change = share.meta.farmerState.spaceUsedBytes - share.meta.farmerState.lastSpaceUsed;
      if (change < 0) {
        share.meta.farmerState.change = `- ${bytes(-1 * change)}`;
      } else {
        share.meta.farmerState.change = `+ ${bytes(change)}`;
      }
      share.meta.farmerState.changeBytes = change;
    }
    obj.totalChange += share.meta.farmerState.changeBytes;
    obj.totalSpaceUsed += share.meta.farmerState.spaceUsedBytes;
    obj.totalPeers += share.meta.farmerState.totalPeers;
    obj.totalRestarts += share.meta.numRestarts;
    obj.totalNewContracts += share.meta.farmerState.contractCount;
  });
  obj.avgPeers = obj.totalPeers / shares.length;
  if (obj.totalChange < 0) {
    obj.totalChange = `- ${bytes(-1 * obj.totalChange)}`;
  } else {
    obj.totalChange = `+ ${bytes(obj.totalChange)}`;
  }
  obj.totalSpaceUsed = bytes(obj.totalSpaceUsed);
  obj.shares = shares;
  return obj;
}

module.exports = {
  getStorjshareDaemonStats,
  getStorjshareDaemonProxyStats,
  getBridgeStats,
  mergeStorjshareStats,
};
