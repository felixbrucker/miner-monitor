const util = require('../../util');
const Mpos = require('./mpos');
const coinGecko = require('../../rates/coingecko');

module.exports = class Miningpoolhub extends Mpos {

  async updateStats() {
    try {
      const poolData = await util.getUrl(`https://miningpoolhub.com/index.php?page=api&action=getminingandprofitsstatistics`);
      const coinArr = poolData.return;
      const statsData = [];
      let profitabilitySum = 0;
      let balanceSumFiat = 0;
      let balanceAESumFiat = 0;
      let balanceOnExchangeSumFiat = 0;
      let balanceTotalSumFiat = 0;
      for (let coin of coinArr) {
        let dashboardData = await util.getUrl(`https://${coin.coin_name}.miningpoolhub.com/index.php?page=api&action=getdashboarddata&api_key=${this.dashboard.api_key}&id=${this.dashboard.user_id}`);
        dashboardData = dashboardData.getdashboarddata.data;
        const coinStats = {
          name: coin.coin_name.charAt(0).toUpperCase() + coin.coin_name.slice(1),
          profitability: coin.profit / 1000000.0, //make gh/s->kh/s for easier calculation
          balance: dashboardData.balance,
          balance_ae: dashboardData.balance_for_auto_exchange,
          onExchange: dashboardData.balance_on_exchange,
          hashrate: dashboardData.raw.personal.hashrate, //kh/s
          symbol: dashboardData.pool.info.currency
        };
        try {
          const workerData = await util.getUrl(`https://${coin.coin_name}.miningpoolhub.com/index.php?page=api&action=getuserworkers&api_key=${this.dashboard.api_key}&id=${this.dashboard.user_id}`);
          if (Array.isArray(workerData.getuserworkers.data)) {
            coinStats.workers = workerData.getuserworkers.data
              .filter((worker) => worker.hashrate !== 0)
              .map((worker) => {
                const arr = worker.username.split('.');
                worker.username = arr[(arr.length === 1 ? 0 : 1)];
                return worker;
              });
          }
        } catch (err) {} // discard worker retrieval errors
        const rates = coinGecko.getRates(coinStats.symbol);
        const rate = rates.length > 0 ? rates[0] : null;
        if (rate) {
          coinStats.balance.confirmedFiat = parseFloat(rate.current_price) * coinStats.balance.confirmed;
          coinStats.balance.unconfirmedFiat = parseFloat(rate.current_price) * coinStats.balance.unconfirmed;
          coinStats.balance_ae.confirmedFiat = parseFloat(rate.current_price) * coinStats.balance_ae.confirmed;
          coinStats.balance_ae.unconfirmedFiat = parseFloat(rate.current_price) * coinStats.balance_ae.unconfirmed;
          coinStats.onExchangeFiat = parseFloat(rate.current_price) * coinStats.onExchange;
          const balanceFiat = coinStats.balance.confirmedFiat + coinStats.balance.unconfirmedFiat;
          const balanceAEFiat = coinStats.balance_ae.confirmedFiat + coinStats.balance_ae.unconfirmedFiat;
          balanceSumFiat += balanceFiat;
          balanceAESumFiat += balanceAEFiat;
          balanceOnExchangeSumFiat += coinStats.onExchangeFiat;
          balanceTotalSumFiat += balanceFiat + balanceAEFiat + coinStats.onExchangeFiat;
        }
        statsData.push(coinStats);
        profitabilitySum += coinStats.profitability * coinStats.hashrate;
      }
      const result = {
        statsData,
        profitabilitySum,
        balanceSumFiat,
        balanceAESumFiat,
        balanceOnExchangeSumFiat,
        balanceTotalSumFiat,
      };
      const rates = coinGecko.getRates('BTC');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.profitabilitySumFiat = parseFloat(rate.current_price) * result.profitabilitySum;
      }

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Miningpoolhub-API] => ${err.message}`);
    }
  }
};
