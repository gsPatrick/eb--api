const packageJson = require('../../../package.json');

function getHealthStatus() {
  return {
    status: 'ok',
    service: 'eb-api',
    version: packageJson.version,
    timestamp: new Date().toISOString(),
  };
}

function getPingStatus() {
  return {
    pong: true,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getHealthStatus,
  getPingStatus,
};
