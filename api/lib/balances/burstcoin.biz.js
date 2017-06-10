const axios = require('axios');

module.exports = async (address) => {
  const balanceData = await axios.get(`https://burstcoin.biz:8125/burst?requestType=getAccount&account=${address}`);
  return balanceData.data.effectiveBalanceNXT / 100000000;
};