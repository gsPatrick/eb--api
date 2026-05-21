const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const serviceExtrasService = require('./service-extras.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { search } = req.query;

  const result = await serviceExtrasService.listServiceExtras({ page, limit, search });
  sendSuccess(res, { data: result.items, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const serviceExtra = await serviceExtrasService.getServiceExtraById(
    req.params.id,
    req.locale
  );
  sendSuccess(res, { data: { serviceExtra } });
});

const create = catchAsync(async (req, res) => {
  const serviceExtra = await serviceExtrasService.createServiceExtra(req.body, req.locale);
  sendCreated(res, { data: { serviceExtra } });
});

const update = catchAsync(async (req, res) => {
  const serviceExtra = await serviceExtrasService.updateServiceExtra(
    req.params.id,
    req.body,
    req.locale
  );
  sendSuccess(res, { data: { serviceExtra } });
});

const remove = catchAsync(async (req, res) => {
  await serviceExtrasService.deleteServiceExtra(req.params.id, req.locale);
  sendNoContent(res);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
