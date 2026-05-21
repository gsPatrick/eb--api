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

module.exports = {
  list,
  assign,
  checkIn,
  addExtra,
  checkOut,
};
