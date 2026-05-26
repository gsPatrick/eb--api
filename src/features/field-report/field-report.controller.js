const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const { processMulterFiles } = require('../../utils/storage');
const fieldReportService = require('./field-report.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  const { status, propertyId } = req.query;

  const result = await fieldReportService.listFieldReports({
    actor: req.user,
    status,
    propertyId,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const create = catchAsync(async (req, res) => {
  const photos = processMulterFiles(req.files);

  const report = await fieldReportService.createFieldReport(
    req.user,
    req.body,
    photos,
    req.locale
  );

  sendCreated(res, {
    message: t('FIELD_REPORT_CREATED_SUCCESS', req.locale),
    data: { report },
  });
});

const resolve = catchAsync(async (req, res) => {
  const report = await fieldReportService.resolveFieldReport(
    req.params.id,
    req.user,
    req.locale
  );

  sendSuccess(res, {
    message: t('FIELD_REPORT_RESOLVED_SUCCESS', req.locale),
    data: { report },
  });
});

module.exports = {
  list,
  create,
  resolve,
};
