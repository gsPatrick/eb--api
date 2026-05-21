const cors = require('cors');
const config = require('../config');

const ALLOWED_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, Accept, Accept-Language';

function reflectOrigin(req, res) {
  const origin = req.headers.origin;

  if (!origin) {
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
}

function openCorsMiddleware(req, res, next) {
  reflectOrigin(req, res);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || ALLOWED_HEADERS
    );
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
      origin: true,
      credentials: true,
    };
  }

  return config.cors.options;
}

module.exports = {
  createCorsMiddleware,
  getSocketCorsOptions,
};
