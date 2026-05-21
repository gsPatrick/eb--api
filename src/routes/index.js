const { Router } = require('express');
const healthRoutes = require('../features/health/health.routes');
const userRoutes = require('../features/user/user.routes');
const propertyRoutes = require('../features/property/property.routes');
const serviceExtrasRoutes = require('../features/service-extras/service-extras.routes');
const serviceOrderRoutes = require('../features/service-order/service-order.routes');
const inventoryRoutes = require('../features/inventory/inventory.routes');
const contractRoutes = require('../features/contract/contract.routes');
const reportRoutes = require('../features/report/report.routes');
const reviewRoutes = require('../features/review/review.routes');

const router = Router();

router.use('/v1', healthRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/properties', propertyRoutes);
router.use('/v1/service-extras', serviceExtrasRoutes);
router.use('/v1/service-orders', serviceOrderRoutes);
router.use('/v1/inventory', inventoryRoutes);
router.use('/v1/contracts', contractRoutes);
router.use('/v1/reports', reportRoutes);
router.use('/v1/reviews', reviewRoutes);

module.exports = router;
