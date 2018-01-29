const MinerManager = require('./miner-manager');
const Storj = require('./storj');

function getClassForMinerType(type) {
  switch(type) {
    case 'miner-agent':
      return MinerManager;
    case 'storj':
      return Storj;
    default:
      throw new Error(`No class matched '${type}'`);
  }
}

module.exports = {
  getClassForMinerType,
};