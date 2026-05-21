const { Router } = require('express');
const geocodingController = require('./geocoding.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN, USER_ROLES.PROVIDER, USER_ROLES.CLIENT));

router.get('/reverse', geocodingController.reverse);
router.get('/search', geocodingController.search);

module.exports = router;
