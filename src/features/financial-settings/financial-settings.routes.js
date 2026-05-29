const { Router } = require('express');
const financialSettingsController = require('./financial-settings.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN));

router.get('/', financialSettingsController.getSettings);
router.patch('/', financialSettingsController.updateSettings);

module.exports = router;
