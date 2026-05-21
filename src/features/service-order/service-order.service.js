const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const config = require('../../config');
const { USER_ROLES, SERVICE_ORDER_STATUSES } = require('../../config/constants');
const {
  sequelize,
  Sequelize,
  ServiceOrder,
  ServiceOrderExtra,
  ServiceExtra,
  Property,
  User,
} = require('../../models');
const notificationProvider = require('../../providers/notification/notification.provider');

const orderIncludes = [
  {
    model: Property,
    as: 'property',
    attributes: ['id', 'name', 'address', 'clientId', 'status', 'latitude', 'longitude'],
  },
  {
    model: User,
    as: 'provider',
    attributes: ['id', 'name', 'email', 'phone', 'role'],
  },
  {
    model: ServiceOrderExtra,
    as: 'extras',
    include: [
      {
        model: ServiceExtra,
        as: 'serviceExtra',
        attributes: ['id', 'name', 'defaultPrice', 'estimatedTime'],
      },
    ],
  },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateCoordinates(lat, long, locale) {
  const latitude = Number(lat);
  const longitude = Number(long);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['lat', 'long'],
    });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['lat', 'long'],
    });
  }

  return { latitude, longitude };
}

const EARTH_RADIUS_METERS = 6371000;

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function checkProximity(propertyCoords, userCoords, maxDistanceMeters, locale) {
  const propertyLat = Number(propertyCoords.latitude);
  const propertyLong = Number(propertyCoords.longitude);

  if (!Number.isFinite(propertyLat) || !Number.isFinite(propertyLong)) {
    throw new AppError(t('PROPERTY_GEO_NOT_CONFIGURED', locale), 400, 'PROPERTY_GEO_NOT_CONFIGURED');
  }

  const distanceMeters = haversineDistanceMeters(
    propertyLat,
    propertyLong,
    userCoords.latitude,
    userCoords.longitude
  );

  if (distanceMeters > maxDistanceMeters) {
    throw new AppError(t('OUT_OF_PROXIMITY', locale), 400, 'OUT_OF_PROXIMITY', {
      distanceMeters: Math.round(distanceMeters),
      maxDistanceMeters,
    });
  }

  return distanceMeters;
}

function assertWithinPropertyGeofence(property, userCoords, locale) {
  return checkProximity(
    property,
    userCoords,
    config.geofence.maxDistanceMeters,
    locale
  );
}

async function getOrderOrFail(id, locale, options = {}) {
  const order = await ServiceOrder.findByPk(id, {
    include: orderIncludes,
    ...options,
  });

  if (!order) {
    throw new AppError(t('SERVICE_ORDER_NOT_FOUND', locale), 404, 'SERVICE_ORDER_NOT_FOUND');
  }

  return order;
}

function assertProviderOwnership(order, actor, locale) {
  if (actor.role !== USER_ROLES.PROVIDER) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  if (!order.providerId || order.providerId !== actor.id) {
    throw new AppError(t('SERVICE_ORDER_NOT_ASSIGNED', locale), 403, 'SERVICE_ORDER_NOT_ASSIGNED');
  }
}

async function recalculateOrderTotals(orderId, transaction) {
  const order = await ServiceOrder.findByPk(orderId, {
    lock: Sequelize.Transaction.LOCK.UPDATE,
    transaction,
  });

  const extras = await ServiceOrderExtra.findAll({
    where: { serviceOrderId: orderId },
    transaction,
  });

  const extrasTotalPrice = extras.reduce(
    (sum, item) => sum + toNumber(item.priceAtTime),
    0
  );
  const basePrice = toNumber(order.basePrice);
  const totalPrice = basePrice + extrasTotalPrice;

  await order.update(
    {
      extrasTotalPrice,
      totalPrice,
    },
    { transaction }
  );

  return order;
}

async function listServiceOrders({ actor, status, page = 1, limit = 20, locale = 'pt' }) {
  const where = {};
  const include = [...orderIncludes];

  if (actor.role === USER_ROLES.PROVIDER) {
    where.providerId = actor.id;
    if (status) {
      where.status = status;
    } else {
      where.status = {
        [Op.in]: [SERVICE_ORDER_STATUSES.PENDING, SERVICE_ORDER_STATUSES.IN_PROGRESS],
      };
    }
  } else if (actor.role === USER_ROLES.CLIENT) {
    include[0] = {
      ...include[0],
      where: { clientId: actor.id },
      required: true,
    };
  } else if (actor.role !== USER_ROLES.ADMIN) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  if (status && actor.role === USER_ROLES.ADMIN) {
    where.status = status;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await ServiceOrder.findAndCountAll({
    where,
    include,
    order: [['scheduledDate', 'ASC'], ['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
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

async function getServiceOrder(id, actor, locale = 'pt') {
  const order = await getOrderOrFail(id, locale);

  if (actor.role === USER_ROLES.PROVIDER) {
    assertProviderOwnership(order, actor, locale);
  } else if (actor.role === USER_ROLES.CLIENT) {
    if (order.property?.clientId !== actor.id) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
  } else if (actor.role !== USER_ROLES.ADMIN) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  return order;
}

async function assignProvider(orderId, providerId, locale) {
  if (!providerId) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['providerId'],
    });
  }

  const order = await getOrderOrFail(orderId, locale);

  if (
    order.status !== SERVICE_ORDER_STATUSES.PENDING &&
    order.status !== SERVICE_ORDER_STATUSES.IN_PROGRESS
  ) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  const provider = await User.findByPk(providerId);

  if (!provider || provider.role !== USER_ROLES.PROVIDER || !provider.active) {
    throw new AppError(t('INVALID_PROVIDER', locale), 400, 'INVALID_PROVIDER');
  }

  await order.update({ providerId });

  const updatedOrder = await getOrderOrFail(order.id, locale);
  notificationProvider.notifyOrderAssigned(updatedOrder, provider);

  return updatedOrder;
}

async function checkIn(orderId, { lat, long, beforePhotos }, actor, locale) {
  const order = await getOrderOrFail(orderId, locale);
  assertProviderOwnership(order, actor, locale);

  if (order.status !== SERVICE_ORDER_STATUSES.PENDING) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  if (!beforePhotos || beforePhotos.length === 0) {
    throw new AppError(t('SERVICE_ORDER_BEFORE_PHOTOS_REQUIRED', locale), 400, 'SERVICE_ORDER_BEFORE_PHOTOS_REQUIRED');
  }

  const userCoords = validateCoordinates(lat, long, locale);
  assertWithinPropertyGeofence(order.property, userCoords, locale);

  await order.update({
    checkinLat: userCoords.latitude,
    checkinLong: userCoords.longitude,
    beforePhotos,
    startedAt: new Date(),
    status: SERVICE_ORDER_STATUSES.IN_PROGRESS,
  });

  const updatedOrder = await getOrderOrFail(order.id, locale);
  notificationProvider.notifyOrderCheckIn(updatedOrder, actor);

  return updatedOrder;
}

async function addExtra(orderId, extraId, actor, locale) {
  if (!extraId) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['extraId'],
    });
  }

  const order = await getOrderOrFail(orderId, locale);
  assertProviderOwnership(order, actor, locale);

  if (order.status !== SERVICE_ORDER_STATUSES.IN_PROGRESS) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  if (!order.startedAt) {
    throw new AppError(t('SERVICE_ORDER_CHECKIN_REQUIRED', locale), 400, 'SERVICE_ORDER_CHECKIN_REQUIRED');
  }

  const serviceExtra = await ServiceExtra.findByPk(extraId);

  if (!serviceExtra) {
    throw new AppError(t('SERVICE_EXTRA_NOT_FOUND', locale), 404, 'SERVICE_EXTRA_NOT_FOUND');
  }

  const transaction = await sequelize.transaction();

  try {
    const existing = await ServiceOrderExtra.findOne({
      where: {
        serviceOrderId: order.id,
        serviceExtraId: extraId,
      },
      transaction,
    });

    if (existing) {
      throw new AppError(
        t('SERVICE_ORDER_EXTRA_ALREADY_ADDED', locale),
        409,
        'SERVICE_ORDER_EXTRA_ALREADY_ADDED'
      );
    }

    await ServiceOrderExtra.create(
      {
        serviceOrderId: order.id,
        serviceExtraId: serviceExtra.id,
        priceAtTime: serviceExtra.defaultPrice,
      },
      { transaction }
    );

    await recalculateOrderTotals(order.id, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();

    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(
        t('SERVICE_ORDER_EXTRA_ALREADY_ADDED', locale),
        409,
        'SERVICE_ORDER_EXTRA_ALREADY_ADDED'
      );
    }

    throw error;
  }

  return getOrderOrFail(order.id, locale);
}

async function checkOut(orderId, { lat, long, afterPhotos }, actor, locale) {
  const order = await getOrderOrFail(orderId, locale);
  assertProviderOwnership(order, actor, locale);

  if (!order.startedAt) {
    throw new AppError(t('SERVICE_ORDER_CHECKIN_REQUIRED', locale), 400, 'SERVICE_ORDER_CHECKIN_REQUIRED');
  }

  if (order.status !== SERVICE_ORDER_STATUSES.IN_PROGRESS) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  if (!afterPhotos || afterPhotos.length === 0) {
    throw new AppError(t('SERVICE_ORDER_PHOTOS_REQUIRED', locale), 400, 'SERVICE_ORDER_PHOTOS_REQUIRED');
  }

  const userCoords = validateCoordinates(lat, long, locale);
  assertWithinPropertyGeofence(order.property, userCoords, locale);

  await order.update({
    checkoutLat: userCoords.latitude,
    checkoutLong: userCoords.longitude,
    finishedAt: new Date(),
    afterPhotos,
    status: SERVICE_ORDER_STATUSES.COMPLETED,
  });

  const updatedOrder = await getOrderOrFail(order.id, locale);
  notificationProvider.notifyOrderCompleted(updatedOrder, updatedOrder.property);

  return updatedOrder;
}

module.exports = {
  listServiceOrders,
  getServiceOrder,
  assignProvider,
  checkIn,
  addExtra,
  checkOut,
  checkProximity,
  haversineDistanceMeters,
};
