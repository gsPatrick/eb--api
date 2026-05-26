const { Router } = require('express');
const recurringScheduleController = require('./recurring-schedule.controller');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { USER_ROLES } = require('../../config/constants');

const router = Router();

router.use(authenticate);

router.get('/', authorize(USER_ROLES.ADMIN), recurringScheduleController.list);

router.post('/', authorize(USER_ROLES.ADMIN), recurringScheduleController.create);

router.patch('/:id', authorize(USER_ROLES.ADMIN), recurringScheduleController.update);

router.delete('/:id', authorize(USER_ROLES.ADMIN), recurringScheduleController.remove);

router.post('/run-now', authorize(USER_ROLES.ADMIN), recurringScheduleController.runNow);

module.exports = router;
