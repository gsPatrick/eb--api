const { Router } = require('express');
const healthController = require('../features/health/health.controller');
const healthRoutes = require('../features/health/health.routes');
const userRoutes = require('../features/user/user.routes');
const propertyRoutes = require('../features/property/property.routes');
const serviceExtrasRoutes = require('../features/service-extras/service-extras.routes');
const serviceOrderRoutes = require('../features/service-order/service-order.routes');
const inventoryRoutes = require('../features/inventory/inventory.routes');
const contractRoutes = require('../features/contract/contract.routes');
const reportRoutes = require('../features/report/report.routes');
const reviewRoutes = require('../features/review/review.routes');
const geocodingRoutes = require('../features/geocoding/geocoding.routes');
const messageRoutes = require('../features/message/message.routes');
const fieldReportRoutes = require('../features/field-report/field-report.routes');
const recurringScheduleRoutes = require('../features/recurring-schedule/recurring-schedule.routes');
const notificationRoutes = require('../features/notification/notification.routes');
const financialSettingsRoutes = require('../features/financial-settings/financial-settings.routes');

const router = Router();

router.get('/', healthController.getApiIndex);
router.use('/v1', healthRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/properties', propertyRoutes);
router.use('/v1/service-extras', serviceExtrasRoutes);
router.use('/v1/service-orders', serviceOrderRoutes);
router.use('/v1/inventory', inventoryRoutes);
router.use('/v1/contracts', contractRoutes);
router.use('/v1/reports', reportRoutes);
router.use('/v1/reviews', reviewRoutes);
router.use('/v1/geocoding', geocodingRoutes);
router.use('/v1/messages', messageRoutes);
router.use('/v1/field-reports', fieldReportRoutes);
router.use('/v1/recurring-schedules', recurringScheduleRoutes);
router.use('/v1/notifications', notificationRoutes);
router.use('/v1/financial-settings', financialSettingsRoutes);

module.exports = router;
