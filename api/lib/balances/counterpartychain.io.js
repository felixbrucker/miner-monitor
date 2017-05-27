const axios = require('axios');

module.exports = async (address) => {
  const balanceData = await axios.get(`https://counterpartychain.io/api/balances/${address}`);
  return balanceData.data.data;
};