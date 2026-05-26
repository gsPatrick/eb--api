const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const config = require('../../config');
const { USER_ROLES, SERVICE_ORDER_STATUSES, CLEANING_TYPES, SERVICE_ORDER_EXTRA_SOURCES, CLIENT_EXTRA_REQUEST_HOURS, PAYMENT_STATUSES, EB_COMMISSION_RATE } = require('../../config/constants');
const { splitOrderFinancials } = require('../../utils/financial');
const { generateInvoicePdf, generateReceiptPdf, buildInvoiceNumber } = require('../../utils/pdf-documents');
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
    include: [
      {
        model: User,
        as: 'client',
        attributes: ['id', 'name', 'email', 'phone', 'role'],
      },
    ],
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

function isValidCleaningType(value) {
  return Object.values(CLEANING_TYPES).includes(value);
}

function parseScheduledDate(value, locale) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['scheduledDate'],
    });
  }
  return String(value);
}

function assertClientExtraRequestWindow(order, locale) {
  const scheduled = new Date(`${order.scheduledDate}T00:00:00`);
  const deadline = new Date(scheduled.getTime() - CLIENT_EXTRA_REQUEST_HOURS * 60 * 60 * 1000);

  if (Date.now() > deadline.getTime()) {
    throw new AppError(t('SERVICE_ORDER_EXTRA_REQUEST_CLOSED', locale), 400, 'SERVICE_ORDER_EXTRA_REQUEST_CLOSED');
  }
}

async function attachExtraToOrder(order, serviceExtra, source, locale, transaction) {
  const existing = await ServiceOrderExtra.findOne({
    where: {
      serviceOrderId: order.id,
      serviceExtraId: serviceExtra.id,
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
      source,
      requestedAt: source === SERVICE_ORDER_EXTRA_SOURCES.CLIENT_REQUEST ? new Date() : null,
    },
    { transaction }
  );

  await recalculateOrderTotals(order.id, transaction);
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
  const financials = splitOrderFinancials(totalPrice);

  await order.update(
    {
      extrasTotalPrice,
      totalPrice: financials.totalPrice,
      commissionAmount: financials.commissionAmount,
      providerPayoutAmount: financials.providerPayoutAmount,
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
    await attachExtraToOrder(
      order,
      serviceExtra,
      SERVICE_ORDER_EXTRA_SOURCES.PROVIDER_FIELD,
      locale,
      transaction
    );
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

async function requestExtra(orderId, extraId, actor, locale) {
  if (!extraId) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['extraId'],
    });
  }

  if (actor.role !== USER_ROLES.CLIENT) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const order = await getOrderOrFail(orderId, locale);

  if (order.property?.clientId !== actor.id) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  if (order.status !== SERVICE_ORDER_STATUSES.PENDING) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  assertClientExtraRequestWindow(order, locale);

  const serviceExtra = await ServiceExtra.findByPk(extraId);

  if (!serviceExtra) {
    throw new AppError(t('SERVICE_EXTRA_NOT_FOUND', locale), 404, 'SERVICE_EXTRA_NOT_FOUND');
  }

  const transaction = await sequelize.transaction();

  try {
    await attachExtraToOrder(
      order,
      serviceExtra,
      SERVICE_ORDER_EXTRA_SOURCES.CLIENT_REQUEST,
      locale,
      transaction
    );
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

async function createServiceOrder(payload, locale) {
  const {
    propertyId,
    scheduledDate,
    cleaningType,
    estimatedDurationMinutes,
    providerId,
    basePrice,
  } = payload;

  if (!propertyId || !scheduledDate) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['propertyId', 'scheduledDate'],
    });
  }

  const parsedDate = parseScheduledDate(scheduledDate, locale);
  const resolvedCleaningType = cleaningType || CLEANING_TYPES.REGULAR_AIRBNB;

  if (!isValidCleaningType(resolvedCleaningType)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['cleaningType'],
    });
  }

  const property = await Property.findByPk(propertyId);

  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  if (property.status !== 'active') {
    throw new AppError(t('PROPERTY_INACTIVE', locale), 400, 'PROPERTY_INACTIVE');
  }

  let resolvedProviderId = null;
  if (providerId) {
    const provider = await User.findByPk(providerId);
    if (!provider || provider.role !== USER_ROLES.PROVIDER || !provider.active) {
      throw new AppError(t('INVALID_PROVIDER', locale), 400, 'INVALID_PROVIDER');
    }
    resolvedProviderId = provider.id;
  }

  const resolvedBasePrice =
    basePrice !== undefined && basePrice !== null && basePrice !== ''
      ? toNumber(basePrice)
      : toNumber(property.defaultCleaningPrice);

  if (resolvedBasePrice < 0) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['basePrice'],
    });
  }

  let resolvedDuration = null;
  if (estimatedDurationMinutes !== undefined && estimatedDurationMinutes !== null && estimatedDurationMinutes !== '') {
    resolvedDuration = Math.round(toNumber(estimatedDurationMinutes));
    if (resolvedDuration <= 0) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['estimatedDurationMinutes'],
      });
    }
  }

  const initialFinancials = splitOrderFinancials(resolvedBasePrice);

  try {
    const order = await ServiceOrder.create({
      propertyId: property.id,
      providerId: resolvedProviderId,
      scheduledDate: parsedDate,
      cleaningType: resolvedCleaningType,
      estimatedDurationMinutes: resolvedDuration,
      status: SERVICE_ORDER_STATUSES.PENDING,
      beforePhotos: [],
      afterPhotos: [],
      basePrice: resolvedBasePrice,
      extrasTotalPrice: 0,
      totalPrice: initialFinancials.totalPrice,
      commissionAmount: initialFinancials.commissionAmount,
      providerPayoutAmount: initialFinancials.providerPayoutAmount,
      clientPaymentStatus: PAYMENT_STATUSES.PENDING,
      providerPaymentStatus: PAYMENT_STATUSES.PENDING,
    });

    if (resolvedProviderId) {
      const provider = await User.findByPk(resolvedProviderId);
      const created = await getOrderOrFail(order.id, locale);
      notificationProvider.notifyOrderAssigned(created, provider);
      return created;
    }

    return getOrderOrFail(order.id, locale);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(t('SERVICE_ORDER_ALREADY_EXISTS', locale), 409, 'SERVICE_ORDER_ALREADY_EXISTS');
    }
    throw error;
  }
}

async function updateServiceOrder(orderId, payload, locale) {
  const order = await getOrderOrFail(orderId, locale);

  if (
    order.status !== SERVICE_ORDER_STATUSES.PENDING &&
    order.status !== SERVICE_ORDER_STATUSES.IN_PROGRESS
  ) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  const updates = {};

  if (payload.scheduledDate !== undefined) {
    updates.scheduledDate = parseScheduledDate(payload.scheduledDate, locale);
  }

  if (payload.cleaningType !== undefined) {
    if (!isValidCleaningType(payload.cleaningType)) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['cleaningType'],
      });
    }
    updates.cleaningType = payload.cleaningType;
  }

  if (payload.estimatedDurationMinutes !== undefined) {
    if (payload.estimatedDurationMinutes === null || payload.estimatedDurationMinutes === '') {
      updates.estimatedDurationMinutes = null;
    } else {
      const duration = Math.round(toNumber(payload.estimatedDurationMinutes));
      if (duration <= 0) {
        throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
          fields: ['estimatedDurationMinutes'],
        });
      }
      updates.estimatedDurationMinutes = duration;
    }
  }

  if (payload.basePrice !== undefined) {
    const price = toNumber(payload.basePrice);
    if (price < 0) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['basePrice'],
      });
    }
    updates.basePrice = price;
  }

  if (payload.providerId !== undefined) {
    if (!payload.providerId) {
      updates.providerId = null;
    } else {
      const provider = await User.findByPk(payload.providerId);
      if (!provider || provider.role !== USER_ROLES.PROVIDER || !provider.active) {
        throw new AppError(t('INVALID_PROVIDER', locale), 400, 'INVALID_PROVIDER');
      }
      updates.providerId = provider.id;
    }
  }

  try {
    await order.update(updates);

    if (updates.basePrice !== undefined) {
      await recalculateOrderTotals(order.id);
    }

    const updated = await getOrderOrFail(order.id, locale);

    if (payload.providerId && updates.providerId) {
      const provider = await User.findByPk(updates.providerId);
      notificationProvider.notifyOrderAssigned(updated, provider);
    }

    return updated;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(t('SERVICE_ORDER_ALREADY_EXISTS', locale), 409, 'SERVICE_ORDER_ALREADY_EXISTS');
    }
    throw error;
  }
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

function assertValidPaymentStatus(value, locale) {
  if (!Object.values(PAYMENT_STATUSES).includes(value)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['paymentStatus'],
    });
  }
}

async function updatePaymentStatuses(orderId, payload, locale) {
  const order = await getOrderOrFail(orderId, locale);
  const updates = {};
  let shouldGenerateReceipt = false;

  if (payload.clientPaymentStatus !== undefined) {
    assertValidPaymentStatus(payload.clientPaymentStatus, locale);
    updates.clientPaymentStatus = payload.clientPaymentStatus;
    updates.clientPaidAt =
      payload.clientPaymentStatus === PAYMENT_STATUSES.PAID ? new Date() : null;
  }

  if (payload.providerPaymentStatus !== undefined) {
    assertValidPaymentStatus(payload.providerPaymentStatus, locale);
    const wasPending = order.providerPaymentStatus !== PAYMENT_STATUSES.PAID;
    updates.providerPaymentStatus = payload.providerPaymentStatus;
    updates.providerPaidAt =
      payload.providerPaymentStatus === PAYMENT_STATUSES.PAID ? new Date() : null;
    shouldGenerateReceipt =
      wasPending && payload.providerPaymentStatus === PAYMENT_STATUSES.PAID;
  }

  if (!Object.keys(updates).length) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['clientPaymentStatus', 'providerPaymentStatus'],
    });
  }

  await order.update(updates);
  let updatedOrder = await getOrderOrFail(order.id, locale);

  if (shouldGenerateReceipt) {
    updatedOrder = await issueProviderReceipt(updatedOrder, locale);
  }

  return updatedOrder;
}

async function issueProviderReceipt(order, locale) {
  if (!order.providerId) {
    throw new AppError(t('REVIEW_NO_PROVIDER', locale), 400, 'REVIEW_NO_PROVIDER');
  }

  const pdf = await generateReceiptPdf(order);
  await order.update({
    receiptUrl: pdf.url,
    receiptGeneratedAt: new Date(),
  });

  const updatedOrder = await getOrderOrFail(order.id, locale);
  notificationProvider.notifyProviderReceipt(updatedOrder);

  return updatedOrder;
}

async function generateInvoice(orderId, locale) {
  const order = await getOrderOrFail(orderId, locale);
  const invoiceNumber = buildInvoiceNumber(order);
  const pdf = await generateInvoicePdf(order);

  await order.update({
    invoiceNumber,
    invoiceUrl: pdf.url,
    invoiceGeneratedAt: new Date(),
  });

  const updatedOrder = await getOrderOrFail(order.id, locale);

  if (order.property?.clientId) {
    notificationProvider.notifyClientInvoice(updatedOrder);
  }

  return {
    order: updatedOrder,
    invoiceUrl: pdf.url,
    invoiceNumber,
  };
}

async function getFinancialSummary(locale) {
  const orders = await ServiceOrder.findAll({
    attributes: [
      'clientPaymentStatus',
      'providerPaymentStatus',
      'totalPrice',
      'commissionAmount',
      'providerPayoutAmount',
    ],
  });

  const summary = {
    currency: 'USD',
    commissionRate: EB_COMMISSION_RATE,
    clientPendingTotal: 0,
    clientPaidTotal: 0,
    providerPendingTotal: 0,
    providerPaidTotal: 0,
    commissionPendingTotal: 0,
    commissionEarnedTotal: 0,
    ordersCount: orders.length,
  };

  for (const order of orders) {
    const total = toNumber(order.totalPrice);
    const commission = toNumber(order.commissionAmount);
    const payout = toNumber(order.providerPayoutAmount);

    if (order.clientPaymentStatus === PAYMENT_STATUSES.PAID) {
      summary.clientPaidTotal += total;
      summary.commissionEarnedTotal += commission;
    } else {
      summary.clientPendingTotal += total;
      summary.commissionPendingTotal += commission;
    }

    if (order.providerPaymentStatus === PAYMENT_STATUSES.PAID) {
      summary.providerPaidTotal += payout;
    } else {
      summary.providerPendingTotal += payout;
    }
  }

  summary.clientPendingTotal = Math.round(summary.clientPendingTotal * 100) / 100;
  summary.clientPaidTotal = Math.round(summary.clientPaidTotal * 100) / 100;
  summary.providerPendingTotal = Math.round(summary.providerPendingTotal * 100) / 100;
  summary.providerPaidTotal = Math.round(summary.providerPaidTotal * 100) / 100;
  summary.commissionPendingTotal = Math.round(summary.commissionPendingTotal * 100) / 100;
  summary.commissionEarnedTotal = Math.round(summary.commissionEarnedTotal * 100) / 100;

  return summary;
}

async function sendCleaningReminder(orderId, locale) {
  const order = await getOrderOrFail(orderId, locale);
  const client = order.property?.client;

  if (!client?.id) {
    throw new AppError(t('PROPERTY_INVALID_CLIENT', locale), 400, 'PROPERTY_INVALID_CLIENT');
  }

  if (order.status !== SERVICE_ORDER_STATUSES.PENDING) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  notificationProvider.notifyCleaningReminder(order, client);

  return {
    sent: true,
    clientId: client.id,
    serviceOrderId: order.id,
    scheduledDate: order.scheduledDate,
  };
}

module.exports = {
  listServiceOrders,
  getServiceOrder,
  createServiceOrder,
  updateServiceOrder,
  assignProvider,
  checkIn,
  addExtra,
  requestExtra,
  checkOut,
  updatePaymentStatuses,
  generateInvoice,
  getFinancialSummary,
  sendCleaningReminder,
  checkProximity,
  haversineDistanceMeters,
};
