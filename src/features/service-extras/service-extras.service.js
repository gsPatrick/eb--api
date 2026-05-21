const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { ServiceExtra } = require('../../models');

async function listServiceExtras({ page = 1, limit = 20, search }) {
  const where = {};

  if (search) {
    where.name = { [Op.iLike]: `%${search}%` };
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await ServiceExtra.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    limit,
    offset,
  });

  return {
    items: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

async function getServiceExtraById(id, locale) {
  const serviceExtra = await ServiceExtra.findByPk(id);

  if (!serviceExtra) {
    throw new AppError(t('SERVICE_EXTRA_NOT_FOUND', locale), 404, 'SERVICE_EXTRA_NOT_FOUND');
  }

  return serviceExtra;
}

async function createServiceExtra(payload, locale) {
  const { name, defaultPrice, estimatedTime } = payload;

  if (!name || defaultPrice === undefined || estimatedTime === undefined) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['name', 'defaultPrice', 'estimatedTime'],
    });
  }

  if (Number(defaultPrice) < 0 || Number(estimatedTime) < 0) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['defaultPrice', 'estimatedTime'],
    });
  }

  return ServiceExtra.create({
    name,
    defaultPrice,
    estimatedTime,
  });
}

async function updateServiceExtra(id, payload, locale) {
  const serviceExtra = await getServiceExtraById(id, locale);

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.defaultPrice !== undefined) {
    if (Number(payload.defaultPrice) < 0) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['defaultPrice'],
      });
    }
    updates.defaultPrice = payload.defaultPrice;
  }
  if (payload.estimatedTime !== undefined) {
    if (Number(payload.estimatedTime) < 0) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['estimatedTime'],
      });
    }
    updates.estimatedTime = payload.estimatedTime;
  }

  await serviceExtra.update(updates);
  return serviceExtra;
}

async function deleteServiceExtra(id, locale) {
  const serviceExtra = await getServiceExtraById(id, locale);
  await serviceExtra.destroy();
}

module.exports = {
  listServiceExtras,
  getServiceExtraById,
  createServiceExtra,
  updateServiceExtra,
  deleteServiceExtra,
};
