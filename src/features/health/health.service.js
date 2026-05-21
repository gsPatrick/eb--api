const packageJson = require('../../../package.json');
const config = require('../../config');

function getHealthStatus() {
  return {
    status: 'ok',
    service: 'eb-api',
    version: packageJson.version,
    apiVersion: 'v1',
    environment: config.env,
    timestamp: new Date().toISOString(),
  };
}

function getPingStatus() {
  return {
    pong: true,
    timestamp: new Date().toISOString(),
  };
}

function getRootInfo() {
  const apiBase = `${config.apiPrefix}/v1`;

  return {
    status: 'ok',
    service: 'eb-api',
    name: packageJson.description,
    version: packageJson.version,
    apiVersion: 'v1',
    environment: config.env,
    timestamp: new Date().toISOString(),
    endpoints: {
      ping: '/ping',
      health: '/health',
      api: config.apiPrefix,
      apiPing: `${apiBase}/ping`,
      apiHealth: `${apiBase}/health`,
    },
  };
}

function getApiIndex() {
  const base = `${config.apiPrefix}/v1`;

  return {
    version: 'v1',
    service: 'eb-api',
    appVersion: packageJson.version,
    environment: config.env,
    timestamp: new Date().toISOString(),
    routes: {
      ping: `${base}/ping`,
      health: `${base}/health`,
      users: `${base}/users`,
      properties: `${base}/properties`,
      serviceExtras: `${base}/service-extras`,
      serviceOrders: `${base}/service-orders`,
      inventory: `${base}/inventory`,
      contracts: `${base}/contracts`,
      reports: `${base}/reports`,
      reviews: `${base}/reviews`,
    },
  };
}

module.exports = {
  getHealthStatus,
  getPingStatus,
  getRootInfo,
  getApiIndex,
};
