const Nicehash = require('./pool/nicehash');
const Miningpoolhub = require('./pool/miningpoolhub');
const Mpos = require('./pool/mpos');
const NodeCryptonotePool = require('./pool/node-cryptonote-pool');
const SnipaNodejsPool = require('./pool/snipa-nodejs-pool');
const Yiimp = require('./pool/yiimp');
const HDPool = require('./pool/hdpool');
const HDPoolControl = require('./custom/hdpool-control');
const HPool = require('./pool/hpool');
const DashboardApi = require('./custom/dashboard-api');
const ColabManagerStatsCollection = require('./custom/colab-manager-stats-collection');
const BitcoinBalance = require('./balances/bitcoin-balance');
const CryptoidBalance = require('./balances/cryptoid-balance');
const CounterpartyBalance = require('./balances/counterparty-balance');
const EthereumBalance = require('./balances/ethereum-balance');
const BitmartBalance = require('./balances/bitmart-balance');
const SignumBalance = require('./balances/signum-balance');
const NicehashBalance = require('./balances/nicehash-balance');
const CoinbaseBalance = require('./balances/coinbase-balance');
const GenericWallet = require('./wallets/generic-wallet');
const BitbeanWallet = require('./wallets/bitbean-wallet');
const BHDWallet = require('./wallets/bhd-wallet');
const DiscWallet = require('./wallets/disc-wallet');
const BurstWallet = require('./wallets/burst-wallet');
const BoomWallet = require('./wallets/boom-wallet');
const WalletAgent = require('./wallets/wallet-agent');
const FoxyPoolV2 = require('./pool/foxy-pool-v2');
const ChiaWallet = require('./wallets/chia-wallet');
const AllTheBlocksBalance = require('./balances/all-the-blocks-balance');
const BhdBalance = require('./balances/bhd-balance');

function getClassForDashboardType(type) {
  switch(type) {
    case 'foxy-pool-v2':
      return FoxyPoolV2;
    case 'nicehash':
      return Nicehash;
    case 'miningpoolhub':
      return Miningpoolhub;
    case 'genericMPOS':
      return Mpos;
    case 'hdpool':
      return HDPool;
    case 'hdpool-control':
      return HDPoolControl;
    case 'hpool':
      return HPool;
    case 'dashboard-api':
      return DashboardApi;
    case 'colab-manager-stats-collection':
      return ColabManagerStatsCollection;
    case 'bitcoinBalance':
      return BitcoinBalance;
    case 'cryptoidBalance':
      return CryptoidBalance;
    case 'counterpartyBalance':
      return CounterpartyBalance;
    case 'ethBalance':
      return EthereumBalance;
    case 'bitmart-balance':
      return BitmartBalance;
    case 'signum-balance':
      return SignumBalance;
    case 'nicehashBalance':
      return NicehashBalance;
    case 'node-cryptonote-pool':
      return NodeCryptonotePool;
    case 'snipa-nodejs-pool':
      return SnipaNodejsPool;
    case 'yiimp':
      return Yiimp;
    case 'generic-wallet':
      return GenericWallet;
    case 'bitbean-wallet':
      return BitbeanWallet;
    case 'bhd-wallet':
      return BHDWallet;
    case 'disc-wallet':
      return DiscWallet;
    case 'burst-wallet':
      return BurstWallet;
    case 'boom-wallet':
      return BoomWallet;
    case 'coinbase':
      return CoinbaseBalance;
    case 'wallet-agent':
      return WalletAgent;
    case 'chia-wallet':
      return ChiaWallet;
    case 'all-the-blocks-balance':
      return AllTheBlocksBalance;
    case 'bhd-balance':
      return BhdBalance;
    default:
      throw new Error(`No class matched '${type}'`);
  }
}

module.exports = {
  getClassForDashboardType,
};
