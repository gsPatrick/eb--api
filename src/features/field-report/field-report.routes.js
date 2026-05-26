const { Router } = require('express');
const fieldReportController = require('./field-report.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { orderPhotosUpload } = require('../../middlewares/upload.middleware');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

function handlePhotosUpload(req, res, next) {
  orderPhotosUpload(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(t('UPLOAD_FILE_TOO_LARGE', req.locale), 400, 'UPLOAD_FILE_TOO_LARGE'));
    }
    if (error.message === 'INVALID_FILE_TYPE') {
      return next(new AppError(t('UPLOAD_INVALID_FILE_TYPE', req.locale), 400, 'UPLOAD_INVALID_FILE_TYPE'));
    }
    return next(new AppError(t('UPLOAD_FAILED', req.locale), 400, 'UPLOAD_FAILED'));
  });
}

router.use(authenticate);

router.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  fieldReportController.list
);

router.post(
  '/',
  authorize(USER_ROLES.PROVIDER),
  handlePhotosUpload,
  fieldReportController.create
);

router.patch(
  '/:id/resolve',
  authorize(USER_ROLES.ADMIN),
  fieldReportController.resolve
);

module.exports = router;
