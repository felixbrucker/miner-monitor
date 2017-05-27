const axios = require('axios');

module.exports = async (address) => {
  const balanceData = await axios.get(`https://blockchain.info/address/${address}?format=json&limit=0`);
  return balanceData.data['final_balance'];
};