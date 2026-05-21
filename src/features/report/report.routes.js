const { Router } = require('express');
const reportController = require('./report.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get(
  '/billing',
  authorize(USER_ROLES.ADMIN),
  reportController.billing
);

module.exports = router;
