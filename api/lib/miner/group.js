const minerUtil = require('./miner-util');

module.exports = class Group {

  constructor(options = {}) {
    this.miner = [];

    this.minerConfigs = options.minerConfigs;
    this.groupConfig = options.groupConfig;
    this.onInit();
  }

  getStats() {
    return {
      devices: this.miner.map(miner => miner.getStats()),
      name: this.groupConfig.name,
    };
  }

  shouldBeDisplayed() {
    return this.groupConfig.display;
  }

  setUpMiner() {
    // start miner
    this.miner = this.minerConfigs.map((miner) => {
      const Class = minerUtil.getClassForMinerType(miner.type);
      return new Class({device: miner, interval: this.groupConfig.interval});
    });
  }

  onInit() {
    this.setUpMiner();
  }
};