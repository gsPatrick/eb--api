const { Router } = require('express');
const healthController = require('./health.controller');

const router = Router();

router.get('/health', healthController.getHealth);
router.get('/ping', healthController.getPing);

module.exports = router;
