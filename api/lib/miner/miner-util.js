const MinerManager = require('./miner-manager');
const CreepMiner = require('./creep-miner');
const Storj = require('./storj');

function getClassForMinerType(type) {
  switch(type) {
    case 'miner-agent':
      return MinerManager;
    case 'storj':
      return Storj;
    case 'creep-miner':
      return CreepMiner;
    default:
      throw new Error(`No class matched '${type}'`);
  }
}

module.exports = {
  getClassForMinerType,
};
