const { Router } = require('express');
const contractController = require('./contract.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get('/acceptances/me', contractController.myAcceptances);
router.get(
  '/acceptances',
  authorize(USER_ROLES.ADMIN),
  contractController.listAcceptances
);
router.get('/', contractController.list);
router.get('/:id', contractController.getById);

router.post('/', authorize(USER_ROLES.ADMIN), contractController.create);
router.put('/:id', authorize(USER_ROLES.ADMIN), contractController.update);
router.delete('/:id', authorize(USER_ROLES.ADMIN), contractController.remove);

router.post('/:id/accept', contractController.accept);

module.exports = router;
