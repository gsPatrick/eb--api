const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/app-error');
const { t } = require('../utils/i18n');
const { User } = require('../models');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(t('UNAUTHORIZED', req.locale), 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user || !user.active) {
      throw new AppError(t('UNAUTHORIZED', req.locale), 401, 'UNAUTHORIZED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError(t('UNAUTHORIZED', req.locale), 401, 'UNAUTHORIZED'));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(t('UNAUTHORIZED', req.locale), 401, 'UNAUTHORIZED'));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError(t('FORBIDDEN', req.locale), 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
