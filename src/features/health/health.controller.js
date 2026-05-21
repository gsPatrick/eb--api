const catchAsync = require('../../utils/catch-async');
const { sendSuccess } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const healthService = require('./health.service');

const getHealth = catchAsync(async (req, res) => {
  const data = healthService.getHealthStatus();
  sendSuccess(res, { message: t('HEALTH_OK', req.locale), data });
});

const getPing = catchAsync(async (req, res) => {
  const data = healthService.getPingStatus();
  sendSuccess(res, { data });
});

module.exports = {
  getHealth,
  getPing,
};
