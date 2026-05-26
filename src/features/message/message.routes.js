const { Router } = require('express');
const messageController = require('./message.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

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
  messageController.create
);

router.patch(
  '/:id/read',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  messageController.markRead
);

module.exports = router;
