const AppError = require('../utils/app-error');
const { t } = require('../utils/i18n');
const config = require('../config');
const { applyOpenCorsHeaders } = require('./cors.middleware');

function notFoundHandler(req, res, next) {
  if (config.cors.allowAll) {
    applyOpenCorsHeaders(req, res);
  }

  if (config.requestLog.enabled) {
    console.warn(`[http] NOT_FOUND ${req.method} ${req.originalUrl} ip=${req.ip}`);
  }

  next(new AppError(t('NOT_FOUND', req.locale), 404, 'NOT_FOUND'));
}

function errorHandler(err, req, res, _next) {
  if (config.cors.allowAll) {
    applyOpenCorsHeaders(req, res);
  }

  const locale = req.locale || 'pt';
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (process.env.NODE_ENV !== 'test' && config.requestLog.enabled) {
    if (statusCode >= 500) {
      console.error(`[http] ${statusCode} ${req.method} ${req.originalUrl} code=${code} ip=${req.ip}`, err.stack || err.message);
    } else if (statusCode >= 400) {
      console.warn(`[http] ${statusCode} ${req.method} ${req.originalUrl} code=${code} ip=${req.ip} msg=${err.message}`);
    }
  }

  const message =
    err.isOperational ? err.message : t('INTERNAL_ERROR', locale);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(process.env.NODE_ENV === 'development' && !err.isOperational
        ? { stack: err.stack }
        : {}),
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
