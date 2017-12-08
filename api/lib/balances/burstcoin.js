const https = require('https');
const axios = require('axios');
const util = require('../util');

module.exports = async (address, rates) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const balanceData = await axios.get(`https://wallet.burst.cryptoguru.org:8125/burst?requestType=getAccount&account=${address}`, {httpsAgent: agent});
  const result = {
    balance: balanceData.data.effectiveBalanceNXT / 100000000,
  };
  const rate = util.getRateForTicker(rates, 'BURST');
  if (rate) {
    result.balanceFiat = parseFloat(rate['price_eur']) * result.balance;
  }
  return result;
};