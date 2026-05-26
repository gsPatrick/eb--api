const { Router } = require('express');
const messageController = require('./message.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');
const { messageAttachmentUpload } = require('../../middlewares/upload.middleware');

const router = Router();

function handleMessageAttachmentUpload(req, res, next) {
  messageAttachmentUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.message === 'INVALID_FILE_TYPE') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: 'Invalid attachment type.' },
      });
      return;
    }

    next(error);
  });
}

router.use(authenticate);

router.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  messageController.list
);

router.get(
  '/unread-count',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  messageController.unreadCount
);

router.post(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  handleMessageAttachmentUpload,
  messageController.create
);

router.patch(
  '/:id/read',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  messageController.markRead
);

module.exports = router;
