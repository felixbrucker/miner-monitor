const util = require('../util');

module.exports = async () => {
  return util.getUrl('https://api.coinmarketcap.com/v1/ticker/?limit=0&convert=EUR');
};
