const { Router } = require('express');
const serviceExtrasController = require('./service-extras.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get('/', serviceExtrasController.list);
router.get('/:id', serviceExtrasController.getById);

router.post('/', authorize(USER_ROLES.ADMIN), serviceExtrasController.create);
router.put('/:id', authorize(USER_ROLES.ADMIN), serviceExtrasController.update);
router.delete('/:id', authorize(USER_ROLES.ADMIN), serviceExtrasController.remove);

module.exports = router;
