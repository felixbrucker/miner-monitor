const https = require('https');
const axios = require('axios');

module.exports = async (address) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const balanceData = await axios.get(`https://wallet.burst.cryptoguru.org:8125/burst?requestType=getAccount&account=${address}`, {httpsAgent: agent});
  return balanceData.data.effectiveBalanceNXT / 100000000;
};