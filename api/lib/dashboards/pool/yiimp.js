const cheerio = require('cheerio');
const util = require('../../util');
const Dashboard = require('../dashboard');

module.exports = class Yiimp extends Dashboard {

  static getDefaults() {
    return {
      interval: 3 * 60 * 1000,
    };
  }

  static parseHashrate(hashrateString) {
    let hashrate = hashrateString.match(/\d+(\.\d+)?/)[0];
    hashrate = parseFloat(hashrate);
    const modifier = hashrateString.match(/[a-z]+\/s/)[0];
    switch(modifier) {
      case 'bh/s':
        hashrate *= 1000;
      case 'th/s':
        hashrate *= 1000;
      case 'gh/s':
        hashrate *= 1000;
      case 'mh/s':
        hashrate *= 1000;
      case 'kh/s':
        hashrate *= 1000;
      case 'h/s':
        break;
    }

    return hashrate;
  }

  constructor(options = {}, coinmarketcap) {
    options = Object.assign(Yiimp.getDefaults(), options);
    super(options, coinmarketcap);
  }

  getStats() {
    return Object.assign(super.getStats(), {
      baseUrl: this.dashboard.baseUrl,
      address: this.dashboard.address,
    });
  }

  async updateStats() {
    try {
      let walletResults = await util.getUrl(`${this.dashboard.baseUrl}/site/wallet_results?address=${this.dashboard.address}`);
      let walletMinersResults = await util.getUrl(`${this.dashboard.baseUrl}/site/wallet_miners_results?address=${this.dashboard.address}`);

      const result = {
        hashrate: null,
        symbol: 'HXX',
        workers: [],
        balance: null,
        unconfirmed: null,
      };

      walletResults = cheerio.load(walletResults);
      let results = [];
      walletResults('.ssrow').map((i, el) => {
          const data = [];
          walletResults(el).children().map((j, el2) => data.push(walletResults(el2).text()));
          results.push(data);
      });
      results.map(row => {
        const filtered = row.filter(entry => entry !== '');
        const unpaid = filtered.find(entry => entry.indexOf('Total Unpaid') !== -1);
        if (unpaid) {
          result.unconfirmed = parseFloat(filtered[filtered.length - 1].split(' ')[0]);
          result.symbol = filtered[filtered.length - 1].split(' ')[1];
          return;
        }
        const balance = filtered.find(entry => entry.indexOf('Balance') !== -1);
        if (balance) {
          result.balance = parseFloat(filtered[filtered.length - 1].split(' ')[0]);
          result.symbol = filtered[filtered.length - 1].split(' ')[1];
        }
      });
      walletMinersResults = cheerio.load(walletMinersResults);
      let worker = [];
      let grid = walletMinersResults('.dataGrid2');
      if (grid.length === 2) {
        grid = grid[1]; // use detailed statistics if summary is present
      }
      walletMinersResults('.ssrow', grid).map((i, el) => {
        const miner = [];
        walletMinersResults(el).children().map((j, el2) => miner.push(walletMinersResults(el2).text()));
        worker.push(miner);
      });
      result.workers = worker.map(miner => ({
        type: miner[0],
        extra: miner[1],
        algo: miner[2],
        diff: miner[3],
        hashrate: Yiimp.parseHashrate(miner[5] ? miner[5] : '0h/s'),
        rejects: miner[6] ? miner[6] : 0,
      }));
      result.hashrate = result.workers.reduce((acc, right) => acc + right.hashrate, 0);


      const rate = util.getRateForTicker(this.coinmarketcap.getRates(), result.symbol.toUpperCase());
      if (rate) {
        result.balanceFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.balance;
        result.unconfirmedFiat = parseFloat(util.getFiatForRate(rate, this.coinmarketcap.getCurrency())) * result.unconfirmed;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Yiimp-API] => ${err.message}`);
    }
  }
};
