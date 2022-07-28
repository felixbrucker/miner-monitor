const axios = require('axios')
const https = require('https')

const Dashboard = require('../dashboard')

module.exports = class ColabManagerStatsCollection extends Dashboard {
  constructor(options = {}) {
    super(options)

    this.apiClient = axios.create({
      baseURL: this.dashboard.baseUrl,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
    this.updateStats()
  }

  async updateStats() {
    if (!this.apiClient) {
      return
    }
    try {
      const { data } = await this.apiClient.get(`/api/stats`)

      const workers = data
        .map(manager => manager.workers.map(worker => ({
          managerId: manager.id,
          workerId: worker.id,
          stats: worker.stats,
        })))
        .reduce((acc, curr) => acc.concat(curr), [])
      workers.sort((a, b) => {
        if (a.stats.documentName < b.stats.documentName) {
          return -1
        }
        if (a.stats.documentName > b.stats.documentName) {
          return 1
        }

        return 0
      })
      this.stats = workers
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Colab-Manager-Stats-Collection] => ${err.message}`)
    }
  }
}
