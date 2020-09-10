const { createHmac } = require('crypto');
const querystring = require('querystring');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'https://api2.nicehash.com';

class NicehashApi {
  constructor({
    apiKey,
    apiSecret,
    organizationId,
    apiUrl = API_URL,
  } = {}) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.organizationId = organizationId;
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'User-Agent': 'NicehashApi/1.0.0',
        'X-User-Agent': 'NicehashApi/1.0.0',
      },
    });
    this.client.interceptors.request.use(this._onBeforeRequestSent.bind(this), (err) => Promise.reject(err));
  }

  async getTime() {
    const { data: { serverTime } } = await this.client.get('/api/v2/time', { isPublic: true });

    return serverTime;
  }

  async getMiningAlgorithmsStats() {
    const { data: { algorithms } } = await this.client.get('/main/api/v2/mining/algo/stats');

    return algorithms;
  }

  async getMiningAlgorithms() {
    const { data: { miningAlgorithms } } = await this.client.get('/main/api/v2/mining/algorithms', { isPublic: true });

    return miningAlgorithms;
  }

  async getMiningGroups() {
    const { data: { groups } } = await this.client.get('/main/api/v2/mining/groups/list', {
      params: {
        extendedResponse: true,
      },
    });

    return groups;
  }

  async getMiningRig({ rigId }) {
    const { data } = await this.client.get(`/main/api/v2/mining/rig2/${rigId}`);

    return data;
  }

  async getMiningStats({ page = 0, limit = 25 } = {}) {
    const { data } = await this.client.get('/main/api/v2/mining/rigs2', {
      params: {
        page,
        size: limit,
      },
    });

    return data;
  }

  async getMiningPayouts({ page = 0, limit = 25 } = {}) {
    const { data: { list } } = await this.client.get('/main/api/v2/mining/rigs/payouts', {
      params: {
        page,
        size: limit,
      },
    });

    return list;
  }

  async getAccount() {
    const { data } = await this.client.get('/main/api/v2/accounting/accounts2', {
      params: {
        extendedResponse: true,
      },
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
      params: config.params,
      body: config.data,
    }));

    return config;
  }

  _getAuthenticatedRequestHeaders(request) {
    const nonce = uuidv4();
    const time = Date.now();

    return {
      'X-Time': time,
      'X-Nonce': nonce,
      'X-Organization-Id': this.organizationId,
      'X-Request-Id': nonce,
      'X-Auth': this._createXAuthHeader({ time, nonce, request }),
    };
  }

  _createXAuthHeader({ time, nonce, request }) {
    return `${this.apiKey}:${this._createHmacSignature({ time, nonce, request })}`;
  }

  _createHmacSignature({ time, nonce, request }) {
    const hmac = createHmac('sha256', this.apiSecret);
    hmac.update(`${this.apiKey}\0${time}\0${nonce}\0\0${this.organizationId}\0\0${request.method}\0${request.path}\0`);
    if (request.params) {
      hmac.update(querystring.encode(request.params));
    }
    if (request.body) {
      hmac.update(`\0${JSON.stringify(request.body)}`);
    }

    return hmac.digest('hex');
  }
}

module.exports = NicehashApi;
