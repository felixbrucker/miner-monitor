const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');
const Miner = require('../miner');

module.exports = class Storj extends Miner {

  async updateStats() {
    try {
      const stats = await new Promise((resolve, reject) => {
        this.client.Dashboard({}, (err, dashboardResponse) => {
          if (err) {
            return reject(err);
          }
          resolve(dashboardResponse);
        });
      });
      stats.last_pinged = new Date(parseInt(stats.last_pinged.seconds, 10) * 1000);
      stats.last_queried = new Date(parseInt(stats.last_queried.seconds, 10) * 1000);
      stats.lastContacted = stats.last_pinged.getTime() > stats.last_queried.getTime() ? stats.last_pinged : stats.last_queried;
      stats.node_connections = parseInt(stats.node_connections, 10);
      stats.node_id = stats.node_id.toString('hex');
      stats.stats.available_bandwidth = parseInt(stats.stats.available_bandwidth, 10);
      stats.stats.available_space = parseInt(stats.stats.available_space, 10);
      stats.stats.used_bandwidth = parseInt(stats.stats.used_bandwidth, 10);
      stats.stats.used_egress = parseInt(stats.stats.used_egress, 10);
      stats.stats.used_ingress = parseInt(stats.stats.used_ingress, 10);
      stats.stats.used_space = parseInt(stats.stats.used_space, 10);
      stats.uptime = parseInt(stats.uptime.seconds, 10);

      this.stats = stats;
    } catch (err) {
      this.stats = null;
      console.error(`[${this.device.name} :: Storj] => ${err.message}`);
    }
  }

  getStats() {
    return Object.assign(
      super.getStats(),
      {
        stats: this.stats,
        id: this.device.id,
      });
  }

  onInit() {
    const packageDefinition = protoLoader.loadSync(`${__dirname}/inspector.proto`, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

    this.client = new protoDescriptor.inspector.PieceStoreInspector(this.device.hostname, grpc.credentials.createInsecure());
    super.onInit();
  }

  cleanup() {
    super.cleanup();
  }
};
