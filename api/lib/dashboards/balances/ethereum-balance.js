const util = require('../../util');
const Dashboard = require('../dashboard');
const coinGecko = require('../../rates/coingecko');

const blacklistedTokens = [
  '0xc12d1c73ee7dc3615ba4e37e4abfdbddfa38907e',
  '0x2e91e3e54c5788e9fdd6a181497fdcea1de1bcc1',
  '0x5e888b83b7287eed4fb7da7b7d0a0d4c735d94b3',
  '0x79186ba0fc6fa49fd9db2f0ba34f36f8c24489c7',
  '0xa0ec5625a9316b9846a7f5239186f0fd1919e516',
  '0xa38b7ee9df79955b90cc4e2de90421f6baa83a3d',
  '0xab95e915c123fded5bdfb6325e35ef5515f1ea69',
  '0xbddab785b306bcd9fb056da189615cc8ece1d823',
  '0xbf52f2ab39e26e0951d2a02b49b7702abe30406a',
  '0x5c406d99e04b8494dc253fcc52943ef82bca7d75',
  '0x7379cbce70bba5a9871f97d33b391afba377e885',
  '0x17a10104cbc1ed155d083ead9fcf5c3440bb50e8',
];

module.exports = class EthereumBalance extends Dashboard {

  static getDefaults() {
    return {
      interval: 10 * 60 * 1000,
    };
  }

  constructor(options = {}) {
    options = Object.assign(EthereumBalance.getDefaults(), options);
    super(options);
  }

  getStats() {
    return Object.assign(super.getStats(), { addr: this.dashboard.address });
  }

  async updateStats() {
    try {
      const balanceData = await util.getUrl(`https://api.ethplorer.io/getAddressInfo/${this.dashboard.address}?apiKey=freekey`);
      const result = {
        eth: balanceData.ETH,
        tokens: balanceData.tokens || [],
      };
      result.eth.balance = result.eth.balance || 0;

      const rates = coinGecko.getRates('ETH');
      const rate = rates.length > 0 ? rates[0] : null;
      if (rate) {
        result.eth.balanceFiat = parseFloat(rate.current_price) * result.eth.balance;
      }
      result.tokens = result.tokens.filter(token => blacklistedTokens.indexOf(token.tokenInfo.address) === -1);
      result.tokens.forEach((token) => {
        token.balance = token.balance / (Math.pow(10, parseInt(token.tokenInfo.decimals)));

        const rates = coinGecko.getRates(token.tokenInfo.symbol);
        const rate = rates.length > 0 ? rates[0] : null;
        if (rate) {
          token.balanceFiat = parseFloat(rate.current_price) * token.balance;
        }
      });

      this.stats = result;
    } catch(err) {
      console.error(`[${this.dashboard.name} :: Ethereum-Balance-API] => ${err.message}`);
    }
  }
};
