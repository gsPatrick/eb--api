const { Router } = require('express');
const reviewController = require('./review.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT),
  reviewController.list
);

router.get(
  '/:id',
  authorize(USER_ROLES.ADMIN, USER_ROLES.CLIENT),
  reviewController.getById
);

router.post('/', authorize(USER_ROLES.CLIENT), reviewController.create);
router.put('/:id', authorize(USER_ROLES.ADMIN), reviewController.update);
router.delete('/:id', authorize(USER_ROLES.ADMIN), reviewController.remove);

module.exports = router;
