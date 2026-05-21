const { Router } = require('express');
const inventoryController = require('./inventory.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  inventoryController.list
);

router.get(
  '/:id',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT, USER_ROLES.PROVIDER),
  inventoryController.getById
);

router.post('/', authorize(USER_ROLES.ADMIN), inventoryController.create);
router.put('/:id', authorize(USER_ROLES.ADMIN), inventoryController.update);
router.delete('/:id', authorize(USER_ROLES.ADMIN), inventoryController.remove);

router.patch(
  '/:id/quantity',
  authorize(USER_ROLES.PROVIDER),
  inventoryController.updateQuantity
);

module.exports = router;
