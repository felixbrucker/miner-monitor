const util = require('../util');

module.exports = async (address, rates) => {
  const balanceData = await util.getUrl(`https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`);
  const result = {
    eth: balanceData.ETH,
    tokens: balanceData.tokens,
  };
  result.eth.balance = result.eth.balance || 0;
  const rate = util.getRateForTicker(rates, 'ETH');
  if (rate) {
    result.eth.balanceFiat = parseFloat(rate['price_eur']) * result.eth.balance;
  }
  result.tokens.forEach((token) => {
    token.balance = token.balance / (Math.pow(10, parseInt(token.tokenInfo.decimals)));
    const rate = util.getRateForTicker(rates, token.tokenInfo.symbol.toUpperCase());
    if (rate) {
      token.balanceFiat = parseFloat(rate['price_eur']) * token.balance;
    }
  });

  return result;
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
