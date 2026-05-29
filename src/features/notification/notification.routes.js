const { Router } = require('express');
const notificationController = require('./notification.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER));

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
