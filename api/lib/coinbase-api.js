const { createHmac } = require('crypto');
const axios = require('axios');
const {sleep} = require('./util')

class CoinbaseApi {
  constructor({
    apiKey,
    apiSecret,
  }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.client = axios.create({
      baseURL: 'https://api.coinbase.com',
    });
    this.client.interceptors.request.use(this._onBeforeRequestSent.bind(this), (err) => Promise.reject(err));
  }

  async listAllAccounts({ excludeZeroBalances }) {
    let cursor = undefined
    let allAccounts = []
    do {
      const accountsResponse = await this._listAccounts({ limit: 250, cursor })
      let filteredAccounts = accountsResponse.accounts
      if (excludeZeroBalances) {
        filteredAccounts = filteredAccounts.filter(account => parseFloat(account.available_balance.value) > 0)
      }
      allAccounts = allAccounts.concat(filteredAccounts)
      cursor = accountsResponse.has_next ? accountsResponse.cursor : undefined
      if (cursor !== undefined) {
        await sleep(0.25)
      }
    } while (cursor !== undefined);

    return allAccounts
  }

  async _listAccounts({ limit = 250, cursor } = {}) {
    const params = { limit }
    if (cursor) {
      params.cursor = cursor
    }
    const { data } = await this.client.get('/api/v3/brokerage/accounts', {
      params,
    });

    return data;
  }

  _onBeforeRequestSent(config) {
    if (config.isPublic) {
      return config;
    }

    config.headers = Object.assign(config.headers, this._getAuthenticatedRequestHeaders({
      method: config.method.toUpperCase(),
      path: config.url,
      body: config.data,
    }));

    return config;
  }

  _getAuthenticatedRequestHeaders(request) {
    const timestamp = Math.floor(Date.now() / 1000);

    return {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-ACCESS-SIGN': this._createSignature({ timestamp, request }),
    };
  }

  _createSignature({ timestamp, request }) {
    const hmac = createHmac('sha256', this.apiSecret);
    hmac.update(`${timestamp}${request.method}${request.path}`);
    if (request.body) {
      hmac.update(`${JSON.stringify(request.body)}`);
    }

    return hmac.digest('hex');
  }
}

module.exports = CoinbaseApi;
