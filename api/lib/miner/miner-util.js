const MinerManager = require('./miner-manager');
const CreepMiner = require('./creep-miner');
const BurstProxy = require('./burst-proxy');
const Storj = require('./storj');
const ChiaPlotter = require('./chia-plotter');
const ChiaMiner = require('./chia-miner');
const ChiaFarmer = require('./chia-farmer');
const ChiaArchiver = require('./chia-archiver');

function getClassForMinerType(type) {
  switch(type) {
    case 'miner-agent':
      return MinerManager;
    case 'storj':
      return Storj;
    case 'chia-plotter':
      return ChiaPlotter;
    case 'chia-miner':
      return ChiaMiner;
    case 'chia-farmer':
      return ChiaFarmer;
    case 'chia-archiver':
      return ChiaArchiver;
    case 'creep-miner':
      return CreepMiner;
    case 'burst-proxy':
      return BurstProxy;
    default:
      throw new Error(`No class matched '${type}'`);
  }
}

module.exports = {
  getClassForMinerType,
};
