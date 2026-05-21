const AppError = require('../utils/app-error');
const { t } = require('../utils/i18n');

function notFoundHandler(req, res, next) {
  next(new AppError(t('NOT_FOUND', req.locale), 404, 'NOT_FOUND'));
}

function errorHandler(err, req, res, _next) {
  const locale = req.locale || 'pt';
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (process.env.NODE_ENV !== 'test') {
    console.error('[error]', err);
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
