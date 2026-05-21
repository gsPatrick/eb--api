const { Router } = require('express');
const propertyController = require('./property.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT),
  propertyController.list
);
router.get(
  '/:id',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT),
  propertyController.getById
);

router.post('/', authorize(USER_ROLES.ADMIN), propertyController.create);
router.put('/:id', authorize(USER_ROLES.ADMIN), propertyController.update);
router.delete('/:id', authorize(USER_ROLES.ADMIN), propertyController.remove);
router.post(
  '/:id/sync-calendar',
  authorize(USER_ROLES.ADMIN),
  propertyController.syncCalendar
);

module.exports = router;
