const { Router } = require('express');
const serviceOrderController = require('./service-order.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { checkoutPhotosUpload, checkinPhotosUpload } = require('../../middlewares/upload.middleware');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

function handleOrderPhotosUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(t('UPLOAD_FILE_TOO_LARGE', req.locale), 400, 'UPLOAD_FILE_TOO_LARGE')
        );
      }

      if (error.message === 'INVALID_FILE_TYPE') {
        return next(
          new AppError(t('UPLOAD_INVALID_FILE_TYPE', req.locale), 400, 'UPLOAD_INVALID_FILE_TYPE')
        );
      }

      return next(
        new AppError(t('UPLOAD_FAILED', req.locale), 400, 'UPLOAD_FAILED', {
          reason: error.message,
        })
      );
    });
  };
}

router.use(authenticate);

router.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  serviceOrderController.list
);

router.patch(
  '/:id/assign',
  authorize(USER_ROLES.ADMIN),
  serviceOrderController.assign
);

router.post(
  '/:id/check-in',
  authorize(USER_ROLES.PROVIDER),
  handleOrderPhotosUpload(checkinPhotosUpload),
  serviceOrderController.checkIn
);

router.post(
  '/:id/extras',
  authorize(USER_ROLES.PROVIDER),
  serviceOrderController.addExtra
);

router.post(
  '/:id/check-out',
  authorize(USER_ROLES.PROVIDER),
  handleOrderPhotosUpload(checkoutPhotosUpload),
  serviceOrderController.checkOut
);

module.exports = router;
