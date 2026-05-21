const { Router } = require('express');
const healthController = require('../features/health/health.controller');

const router = Router();

router.get('/', healthController.getRoot);
router.get('/ping', healthController.getPing);
router.get('/health', healthController.getHealth);

module.exports = router;
