const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES, SERVICE_ORDER_STATUSES } = require('../../config/constants');
const { InventoryItem, Property, ServiceOrder } = require('../../models');
const notificationProvider = require('../../providers/notification/notification.provider');

const propertyInclude = {
  model: Property,
  as: 'property',
  attributes: ['id', 'name', 'address', 'clientId'],
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInventoryItem(item) {
  const data = item.toJSON ? item.toJSON() : { ...item };
  const currentQuantity = toNumber(data.currentQuantity);
  const criticalLevel = toNumber(data.criticalLevel);

  return {
    ...data,
    is_critical: currentQuantity <= criticalLevel,
  };
}

async function assertPropertyAccess(propertyId, actor, locale) {
  const property = await Property.findByPk(propertyId);

  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  if (actor.role === USER_ROLES.CLIENT && property.clientId !== actor.id) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  return property;
}

async function getItemOrFail(id, locale, options = {}) {
  const item = await InventoryItem.findByPk(id, {
    include: [propertyInclude],
    ...options,
  });

  if (!item) {
    throw new AppError(t('INVENTORY_ITEM_NOT_FOUND', locale), 404, 'INVENTORY_ITEM_NOT_FOUND');
  }

  return item;
}

async function assertItemReadable(item, actor, locale) {
  if (actor.role === USER_ROLES.ADMIN) {
    return;
  }

  if (actor.role === USER_ROLES.CLIENT) {
    if (item.property?.clientId !== actor.id) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
    return;
  }

  if (actor.role === USER_ROLES.PROVIDER) {
    const assignedOrder = await ServiceOrder.findOne({
      where: {
        propertyId: item.propertyId,
        providerId: actor.id,
      },
    });

    if (!assignedOrder) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
    return;
  }

  throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
}

async function getProviderPropertyIds(providerId) {
  const orders = await ServiceOrder.findAll({
    where: { providerId },
    attributes: ['propertyId'],
  });

  return [...new Set(orders.map((order) => order.propertyId).filter(Boolean))];
}

function notifyIfCritical(item, property) {
  if (!item.is_critical) return;

  notificationProvider.notifyInventoryCritical(item, property || item.property);
}

async function assertProviderCanUpdateQuantity(item, actor, locale) {
  const activeOrder = await ServiceOrder.findOne({
    where: {
      propertyId: item.propertyId,
      providerId: actor.id,
      status: SERVICE_ORDER_STATUSES.IN_PROGRESS,
    },
  });

  if (!activeOrder) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }
}

async function listInventoryItems({ actor, propertyId, page = 1, limit = 50, locale }) {
  const where = {};
  const include = [{ ...propertyInclude }];

  if (propertyId) {
    where.propertyId = propertyId;
  }

  if (actor.role === USER_ROLES.CLIENT) {
    include[0] = {
      ...include[0],
      where: { clientId: actor.id },
      required: true,
    };
  } else if (actor.role === USER_ROLES.PROVIDER) {
    const propertyIds = await getProviderPropertyIds(actor.id);

    if (!propertyIds.length) {
      return {
        items: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    if (propertyId) {
      if (!propertyIds.includes(propertyId)) {
        throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
      }
      where.propertyId = propertyId;
    } else {
      where.propertyId = { [Op.in]: propertyIds };
    }
  } else if (actor.role === USER_ROLES.ADMIN) {
    if (propertyId) {
      await assertPropertyAccess(propertyId, actor, locale);
    }
  } else {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await InventoryItem.findAndCountAll({
    where,
    include,
    order: [['name', 'ASC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    items: rows.map(formatInventoryItem),
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

async function getInventoryItemById(id, actor, locale) {
  const item = await getItemOrFail(id, locale);
  await assertItemReadable(item, actor, locale);
  return formatInventoryItem(item);
}

async function createInventoryItem(payload, locale) {
  const { propertyId, name, currentQuantity, criticalLevel, unit } = payload;

  if (!propertyId || !name) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['propertyId', 'name'],
    });
  }

  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  try {
    const item = await InventoryItem.create({
      propertyId,
      name,
      currentQuantity: currentQuantity ?? 0,
      criticalLevel: criticalLevel ?? 0,
      unit: unit || 'unidade',
    });

    return formatInventoryItem(await getItemOrFail(item.id, locale));
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(t('INVENTORY_ITEM_ALREADY_EXISTS', locale), 409, 'INVENTORY_ITEM_ALREADY_EXISTS');
    }
    throw error;
  }
}

async function updateInventoryItem(id, payload, locale) {
  const item = await getItemOrFail(id, locale);

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.currentQuantity !== undefined) updates.currentQuantity = payload.currentQuantity;
  if (payload.criticalLevel !== undefined) updates.criticalLevel = payload.criticalLevel;
  if (payload.unit !== undefined) updates.unit = payload.unit;

  await item.update(updates);

  const formatted = formatInventoryItem(await getItemOrFail(id, locale));
  notifyIfCritical(formatted, formatted.property);
  return formatted;
}

async function deleteInventoryItem(id, locale) {
  const item = await getItemOrFail(id, locale);
  await item.destroy();
}

async function updateQuantity(id, currentQuantity, actor, locale) {
  if (currentQuantity === undefined || currentQuantity === null) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['currentQuantity'],
    });
  }

  const quantity = toNumber(currentQuantity);
  if (quantity < 0) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['currentQuantity'],
    });
  }

  const item = await getItemOrFail(id, locale);
  await assertProviderCanUpdateQuantity(item, actor, locale);

  await item.update({ currentQuantity: quantity });

  const formatted = formatInventoryItem(await getItemOrFail(id, locale));
  notifyIfCritical(formatted, formatted.property);
  return formatted;
}

module.exports = {
  listInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateQuantity,
  formatInventoryItem,
};
