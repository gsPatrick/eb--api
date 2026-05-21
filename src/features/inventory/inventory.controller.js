const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const inventoryService = require('./inventory.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const { propertyId } = req.query;

  const result = await inventoryService.listInventoryItems({
    actor: req.user,
    propertyId,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const item = await inventoryService.getInventoryItemById(
    req.params.id,
    req.user,
    req.locale
  );
  sendSuccess(res, { data: { item } });
});

const create = catchAsync(async (req, res) => {
  const item = await inventoryService.createInventoryItem(req.body, req.locale);
  sendCreated(res, {
    message: t('INVENTORY_CREATED_SUCCESS', req.locale),
    data: { item },
  });
});

const update = catchAsync(async (req, res) => {
  const item = await inventoryService.updateInventoryItem(
    req.params.id,
    req.body,
    req.locale
  );
  sendSuccess(res, {
    message: t('INVENTORY_UPDATED_SUCCESS', req.locale),
    data: { item },
  });
});

const remove = catchAsync(async (req, res) => {
  await inventoryService.deleteInventoryItem(req.params.id, req.locale);
  sendNoContent(res);
});

const updateQuantity = catchAsync(async (req, res) => {
  const quantity = req.body.currentQuantity ?? req.body.quantity;
  const item = await inventoryService.updateQuantity(
    req.params.id,
    quantity,
    req.user,
    req.locale
  );
  sendSuccess(res, {
    message: t('INVENTORY_QUANTITY_UPDATED_SUCCESS', req.locale),
    data: { item },
  });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  updateQuantity,
};
