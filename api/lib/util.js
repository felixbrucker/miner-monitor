const bytes = require('bytes');

function mergeStorjshareStats(stats, storjshareData) {
  const shares = stats.shares;
  const obj = Object.assign({}, stats);
  obj.totalSpaceUsed = 0;
  obj.totalChange = 0;
  obj.totalPeers = 0;
  obj.totalRestarts = 0;
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
  mergeStorjshareStats,
};