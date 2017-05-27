const axios = require('axios');

module.exports = async (address) => {
  const balanceData = await axios.get(`https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`);
  return {
    eth: balanceData.data.ETH,
    tokens: balanceData.data.tokens,
  };
};


/*
{
  eth: {      # ETH specific information
    balance:  # ETH balance
    totalIn:  # Total incoming ETH value
    totalOut: # Total outgoing ETH value
  },
  tokens: [   # exists if specified address has any token balances
  {
    tokenInfo: # token data (same format as token info),
    balance:   # token balance (as is, not reduced to a floating point value),
    totalIn:   # total incoming token value
    totalOut:  # total outgoing token value
  },
  ...
  ]
}
*/
