const { Router } = require('express');
const userController = require('./user.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { avatarUpload } = require('../../middlewares/upload.middleware');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

function handleAvatarUpload(req, res, next) {
  avatarUpload(req, res, (error) => {
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

router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/me', authenticate, userController.getMe);
router.patch('/me', authenticate, userController.updateMe);
router.patch('/me/avatar', authenticate, handleAvatarUpload, userController.updateAvatar);

router.post('/admin', authenticate, authorize(USER_ROLES.ADMIN), userController.createAdmin);

router.get('/', authenticate, authorize(USER_ROLES.ADMIN), userController.list);

router.get(
  '/:id/average-rating',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  userController.getProviderRating
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  userController.updateStatus
);

router.patch(
  '/:id/role',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  userController.updateRole
);

router.get('/:id', authenticate, authorize(USER_ROLES.ADMIN), userController.getById);

module.exports = router;
