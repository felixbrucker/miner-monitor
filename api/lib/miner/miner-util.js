const MinerManager = require('./miner-manager');

function getClassForMinerType(type) {
  switch(type) {
    case 'miner-agent':
      return MinerManager;
    default:
      throw new Error(`No class matched '${type}'`);
  }
}

module.exports = {
  getClassForMinerType,
};