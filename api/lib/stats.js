// Group
const Group = require('../lib/miner/group');

// Util
const util = require('../lib/util');
const dashboardUtil = require('../lib/dashboards/dashboard-util');
const configModule = require(__basedir + 'api/modules/configModule');

module.exports = class Stats {

  constructor() {
    this.instances = {
      dashboard: [],
      group: [],
    };
    this.onInit();
  }

  async initializeAllDashboards() {
    console.log(`initializing all dashboards..`);
    const dashboards = configModule.config.dashboardData
      .filter(dashboard => dashboard.enabled);
    const nonNicehashDashboards = dashboards.filter(dashboard => dashboard.type !== 'nicehash');
    const nicehashDashboards = dashboards.filter(dashboard => dashboard.type === 'nicehash');
    this.instances.dashboard = [];
    for (const dashboard of nonNicehashDashboards) {
      const Class = dashboardUtil.getClassForDashboardType(dashboard.type);
      this.instances.dashboard.push(new Class({ dashboard }));
      // await util.sleep(1);
    }
    // start nicehash dashboards with 31 sec delays to workaround nicehash api limits
    for (const dashboard of nicehashDashboards) {
      const Class = dashboardUtil.getClassForDashboardType(dashboard.type);
      this.instances.dashboard.push(new Class({ dashboard }));
      await util.sleep(31);
    }
    console.log(`initialized all dashboards`);
  }

  initializeAllGroups() {
    console.log(`initializing all groups..`);
    this.instances.group = configModule.config.groups
      .filter(group => group.enabled)
      .map((group) => {
        const devicesInGroup = configModule.config.devices
          .filter(device => device.enabled && device.group === group.id);
        const options = {
          groupConfig: JSON.parse(JSON.stringify(group)),
          minerConfigs: devicesInGroup,
        };
        options.groupConfig.interval = (group.interval ? group.interval : configModule.config.interval) * 1000;
        return new Group(options);
      });
    console.log(`initialized all groups`);
  }

  getStats() {
    const entries = this.instances.group
      .filter(group => group.shouldBeDisplayed())
      .map(instance => instance.getStats());
    const dashboardData = this.instances.dashboard.map(instance => instance.getStats());
    dashboardData.sort(function (a, b) {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    return { entries, dashboardData };
  }

  cleanup() {
    this.instances.dashboard.map(dashboard => dashboard.cleanup());
    this.instances.group.map(group => group.cleanup());
    this.instances = {
      dashboard: [],
      group: [],
    };
  }

  async onInit() {
    this.initializeAllGroups();
    await this.initializeAllDashboards();
  }
};
