const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const recurringScheduleService = require('./recurring-schedule.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const { propertyId, active } = req.query;

  const result = await recurringScheduleService.listSchedules({
    propertyId,
    active,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const create = catchAsync(async (req, res) => {
  const schedule = await recurringScheduleService.createSchedule(req.body, req.locale);
  sendCreated(res, { data: { schedule } });
});

const update = catchAsync(async (req, res) => {
  const schedule = await recurringScheduleService.updateSchedule(
    req.params.id,
    req.body,
    req.locale
  );
  sendSuccess(res, { data: { schedule } });
});

const remove = catchAsync(async (req, res) => {
  await recurringScheduleService.removeSchedule(req.params.id, req.locale);
  sendNoContent(res);
});

const runNow = catchAsync(async (req, res) => {
  const results = await recurringScheduleService.processDueSchedules(req.locale);
  sendSuccess(res, {
    message: t('RECURRING_SCHEDULE_RUN_SUCCESS', req.locale),
    data: { results },
  });
});

module.exports = {
  list,
  create,
  update,
  remove,
  runNow,
};
