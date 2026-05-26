const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const propertyService = require('./property.service');

const create = catchAsync(async (req, res) => {
  const property = await propertyService.createProperty(req.body, req.locale);
  sendCreated(res, { data: { property } });
});

const update = catchAsync(async (req, res) => {
  const property = await propertyService.updateProperty(req.params.id, req.body, req.locale);
  sendSuccess(res, { data: { property } });
});

const remove = catchAsync(async (req, res) => {
  await propertyService.deleteProperty(req.params.id, req.locale);
  sendNoContent(res);
});

const getById = catchAsync(async (req, res) => {
  const property = await propertyService.getPropertyById(
    req.params.id,
    req.user,
    req.locale
  );
  sendSuccess(res, { data: { property } });
});

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { status, clientId, search } = req.query;

  const result = await propertyService.listProperties({
    actor: req.user,
    status,
    clientId,
    search,
    page,
    limit,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const syncCalendar = catchAsync(async (req, res) => {
  const result = await propertyService.syncCalendar(req.params.id, req.locale);
  sendSuccess(res, { data: result });
});

module.exports = {
  create,
  update,
  remove,
  getById,
  list,
  syncCalendar,
};
