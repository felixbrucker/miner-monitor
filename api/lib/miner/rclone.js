const axios = require('axios')

const Capacity = require('../capacity')
const Miner = require('./miner')

const shortenString = ((string, maxLength = 20) => {
  if (string.length <= maxLength) {
    return string
  }
  const halfMaxLength = Math.floor(maxLength / 2)

  return `${string.slice(0, halfMaxLength)}..${string.slice(-halfMaxLength)}`
})

module.exports = class Rclone extends Miner {
  onInit() {
    this.apiClient = axios.create({
      baseURL: this.device.hostname,
    })
    super.onInit();
  }

  async updateStats() {
    try {
      const { data } = await this.apiClient.post(`/core/stats`)

      const totalGib = Capacity.fromBytes(data.totalBytes).capacityInGib;
      const transferredGib = Capacity.fromBytes(data.bytes).capacityInGib;
      const percentage = transferredGib.dividedBy(totalGib).multipliedBy(100)

      this.stats = {
        totalGib: totalGib.toNumber(),
        transferredGib: transferredGib.toNumber(),
        percentage: percentage.toNumber(),
        speedInMibPerSec: Capacity.fromBytes(data.speed).toMiB().toNumber(),
        transfers: data.transferring.map(transfer => {
          const transferTotalGib = Capacity.fromBytes(transfer.size).capacityInGib;
          const transferTransferredGib = Capacity.fromBytes(transfer.bytes).capacityInGib;
          const percentage = transferTransferredGib.dividedBy(transferTotalGib).multipliedBy(100)

          return {
            shortName: shortenString(transfer.name, 50),
            fileName: transfer.name,
            totalGib: transferTotalGib.toNumber(),
            transferredGib: transferTransferredGib.toNumber(),
            percentage: percentage.toNumber(),
            speedInMibPerSec: Capacity.fromBytes(transfer.speed).toMiB().toNumber(),
          }
        }),
      }
    } catch(err) {
      this.stats = null;
      console.error(`[${this.device.name} :: Rclone] => ${err.message}`)
    }
  }

  getStats() {
    return Object.assign(
      super.getStats(),
      {
        stats: this.stats,
        id: this.device.id,
      }
    );
  }
}
