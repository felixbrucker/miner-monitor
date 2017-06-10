const axios = require('axios');

module.exports = async (address) => {
  const balanceData = await axios.get(`https://wallet.burst-team.us:8127/burst?requestType=getAccount&account=${address}`);
  return balanceData.data.effectiveBalanceNXT / 100000000;
};