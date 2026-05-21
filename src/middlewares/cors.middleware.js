const cors = require('cors');
const config = require('../config');

const ALLOWED_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
const ALLOWED_HEADERS =
  'Content-Type, Authorization, Accept, Accept-Language, X-Requested-With, Origin';
const MAX_AGE = '86400';

function applyOpenCorsHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || ALLOWED_HEADERS
  );
  res.setHeader('Access-Control-Max-Age', MAX_AGE);
}

function openCorsMiddleware(req, res, next) {
  applyOpenCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
}

function createCorsMiddleware() {
  if (config.cors.allowAll) {
    return openCorsMiddleware;
  }

  return cors(config.cors.options);
}

function getSocketCorsOptions() {
  if (config.cors.allowAll) {
    return {
      origin: '*',
      methods: ['GET', 'POST'],
    };
  }

  return config.cors.options;
}

module.exports = {
  applyOpenCorsHeaders,
  createCorsMiddleware,
  getSocketCorsOptions,
};
