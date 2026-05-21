const { SUPPORTED_LOCALES, DEFAULT_LOCALE } = require('../config/constants');

function parseAcceptLanguage(header) {
  if (!header) {
    return DEFAULT_LOCALE;
  }

  const primary = header.split(',')[0].trim().split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(primary) ? primary : DEFAULT_LOCALE;
}

function localeMiddleware(req, res, next) {
  req.locale =
    req.headers['x-locale'] ||
    parseAcceptLanguage(req.headers['accept-language']) ||
    DEFAULT_LOCALE;
  next();
}

module.exports = {
  localeMiddleware,
};
