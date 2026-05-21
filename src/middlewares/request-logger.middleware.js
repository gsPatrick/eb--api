const config = require('../config');

function maskAuthHeader(value) {
  if (!value) return 'none';
  if (value.startsWith('Bearer ')) return 'Bearer ***';
  return 'present';
}

function requestLogger(req, res, next) {
  if (!config.requestLog.enabled) {
    return next();
  }

  const startedAt = Date.now();
  const origin = req.headers.origin || '-';
  const auth = maskAuthHeader(req.headers.authorization);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const message = `[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms ip=${req.ip} origin=${origin} auth=${auth}`;

    if (level === 'error') {
      console.error(message);
      return;
    }

    if (level === 'warn') {
      console.warn(message);
      return;
    }

    console.log(message);
  });

  return next();
}

module.exports = {
  requestLogger,
};
