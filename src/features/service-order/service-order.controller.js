const catchAsync = require('../../utils/catch-async');
const { sendSuccess } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const { processMulterFiles, parsePhotoUrls } = require('../../utils/storage');
const serviceOrderService = require('./service-order.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { status } = req.query;

  const result = await serviceOrderService.listServiceOrders({
    actor: req.user,
    status,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const order = await serviceOrderService.getServiceOrder(
    req.params.id,
    req.user,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const create = catchAsync(async (req, res) => {
  const order = await serviceOrderService.createServiceOrder(req.body, req.locale);
  sendSuccess(res, { statusCode: 201, data: { order } });
});

const update = catchAsync(async (req, res) => {
  const order = await serviceOrderService.updateServiceOrder(
    req.params.id,
    req.body,
    req.locale
  );
  sendSuccess(res, { data: { order } });
});

const assign = catchAsync(async (req, res) => {
  const order = await serviceOrderService.assignProvider(
    req.params.id,
    req.body.providerId,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const checkIn = catchAsync(async (req, res) => {
  const uploadedPhotos = processMulterFiles(req.files);
  const bodyPhotos = parsePhotoUrls(req.body.before_photos);
  const beforePhotos = [...uploadedPhotos, ...bodyPhotos];

  const order = await serviceOrderService.checkIn(
    req.params.id,
    {
      lat: req.body.lat,
      long: req.body.long,
      beforePhotos,
    },
    req.user,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const addExtra = catchAsync(async (req, res) => {
  const order = await serviceOrderService.addExtra(
    req.params.id,
    req.body.extraId,
    req.user,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const requestExtra = catchAsync(async (req, res) => {
  const order = await serviceOrderService.requestExtra(
    req.params.id,
    req.body.extraId,
    req.user,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const checkOut = catchAsync(async (req, res) => {
  const uploadedPhotos = processMulterFiles(req.files);
  const bodyPhotos = parsePhotoUrls(req.body.after_photos);
  const afterPhotos = [...uploadedPhotos, ...bodyPhotos];

  const order = await serviceOrderService.checkOut(
    req.params.id,
    {
      lat: req.body.lat,
      long: req.body.long,
      afterPhotos,
    },
    req.user,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const updatePayments = catchAsync(async (req, res) => {
  const order = await serviceOrderService.updatePaymentStatuses(
    req.params.id,
    req.body,
    req.locale
  );

  sendSuccess(res, { data: { order } });
});

const createInvoice = catchAsync(async (req, res) => {
  const result = await serviceOrderService.generateInvoice(req.params.id, req.locale);

  sendSuccess(res, {
    message: t('INVOICE_GENERATED_SUCCESS', req.locale),
    data: result,
  });
});

const financialSummary = catchAsync(async (req, res) => {
  const summary = await serviceOrderService.getFinancialSummary(req.locale);
  sendSuccess(res, { data: { summary } });
});

const sendReminder = catchAsync(async (req, res) => {
  const result = await serviceOrderService.sendCleaningReminder(req.params.id, req.locale);
  sendSuccess(res, {
    message: t('CLEANING_REMINDER_SENT_SUCCESS', req.locale),
    data: result,
  });
});

module.exports = {
  list,
  getById,
  create,
  update,
  assign,
  checkIn,
  addExtra,
  requestExtra,
  checkOut,
  updatePayments,
  createInvoice,
  financialSummary,
  sendReminder,
};
