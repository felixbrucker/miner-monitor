const axios = require('axios');

module.exports = async (address, ticker, apiKey) => {
  const balanceData = await axios.get(`https://chainz.cryptoid.info/${ticker}/api.dws?q=getbalance&a=${address}${apiKey ? '&key=' + apiKey : ''}`);
  return balanceData.data;
};