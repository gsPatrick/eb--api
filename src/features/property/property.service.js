const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const {
  USER_ROLES,
  PROPERTY_STATUSES,
  SERVICE_ORDER_STATUSES,
} = require('../../config/constants');
const { Property, ServiceOrder, User } = require('../../models');
const icalProvider = require('../../providers/ical/ical.provider');

const clientInclude = {
  model: User,
  as: 'client',
  attributes: ['id', 'name', 'email', 'role'],
};

function buildAccessFilter(actor) {
  if (actor.role === USER_ROLES.CLIENT) {
    return { clientId: actor.id };
  }

  if (actor.role === USER_ROLES.ADMIN) {
    return {};
  }

  return null;
}

function mergeMetadata(existing, incoming) {
  if (incoming === undefined || incoming === null) {
    return existing || {};
  }

  if (typeof incoming !== 'object' || Array.isArray(incoming)) {
    return null;
  }

  return { ...(existing || {}), ...incoming };
}

async function assertClientExists(clientId, locale) {
  const client = await User.findByPk(clientId);

  if (!client || client.role !== USER_ROLES.CLIENT) {
    throw new AppError(t('PROPERTY_INVALID_CLIENT', locale), 400, 'PROPERTY_INVALID_CLIENT');
  }

  return client;
}

async function getPropertyOrFail(id, actor, locale) {
  const accessFilter = buildAccessFilter(actor);

  if (accessFilter === null) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const property = await Property.findOne({
    where: { id, ...accessFilter },
    include: [clientInclude],
  });

  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  return property;
}

function parseOptionalCoordinate(value, field, locale, { min, max }) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: [field],
    });
  }

  return parsed;
}

function parsePropertyCoordinates(payload, locale) {
  const latitude = parseOptionalCoordinate(payload.latitude, 'latitude', locale, {
    min: -90,
    max: 90,
  });
  const longitude = parseOptionalCoordinate(payload.longitude, 'longitude', locale, {
    min: -180,
    max: 180,
  });

  if (
    (latitude === null && longitude !== null) ||
    (latitude !== null && longitude === null)
  ) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['latitude', 'longitude'],
    });
  }

  return { latitude, longitude };
}

async function createProperty(payload, locale) {
  const {
    name,
    address,
    description,
    icalUrl,
    clientId,
    status,
    metadata,
    defaultCleaningPrice,
  } = payload;

  if (!name || !address || !clientId) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['name', 'address', 'clientId'],
    });
  }

  await assertClientExists(clientId, locale);

  if (metadata !== undefined && mergeMetadata({}, metadata) === null) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['metadata'],
    });
  }

  const { latitude, longitude } = parsePropertyCoordinates(payload, locale);

  const property = await Property.create({
    name,
    address,
    description: description || null,
    icalUrl: icalUrl || null,
    clientId,
    status: status || PROPERTY_STATUSES.ACTIVE,
    metadata: mergeMetadata({}, metadata),
    defaultCleaningPrice: defaultCleaningPrice ?? 0,
    latitude,
    longitude,
  });

  return Property.findByPk(property.id, { include: [clientInclude] });
}

async function updateProperty(id, payload, locale) {
  const property = await Property.findByPk(id);

  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  if (payload.clientId) {
    await assertClientExists(payload.clientId, locale);
  }

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.address !== undefined) updates.address = payload.address;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.icalUrl !== undefined) updates.icalUrl = payload.icalUrl;
  if (payload.clientId !== undefined) updates.clientId = payload.clientId;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.defaultCleaningPrice !== undefined) {
    updates.defaultCleaningPrice = payload.defaultCleaningPrice;
  }
  if (payload.latitude !== undefined || payload.longitude !== undefined) {
    const nextLatitude =
      payload.latitude !== undefined ? payload.latitude : property.latitude;
    const nextLongitude =
      payload.longitude !== undefined ? payload.longitude : property.longitude;
    const { latitude, longitude } = parsePropertyCoordinates(
      { latitude: nextLatitude, longitude: nextLongitude },
      locale
    );
    updates.latitude = latitude;
    updates.longitude = longitude;
  }
  if (payload.metadata !== undefined) {
    const merged = mergeMetadata(property.metadata, payload.metadata);
    if (merged === null) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['metadata'],
      });
    }
    updates.metadata = merged;
  }

  await property.update(updates);

  return Property.findByPk(property.id, { include: [clientInclude] });
}

async function deleteProperty(id, locale) {
  const property = await Property.findByPk(id);

  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  await property.destroy();
}

async function getPropertyById(id, actor, locale) {
  return getPropertyOrFail(id, actor, locale);
}

async function listProperties({ actor, status, clientId, page = 1, limit = 20 }) {
  const accessFilter = buildAccessFilter(actor);

  if (accessFilter === null) {
    return {
      items: [],
      meta: { total: 0, page, limit, totalPages: 1 },
    };
  }

  const where = { ...accessFilter };

  if (status) {
    where.status = status;
  }

  if (actor.role === USER_ROLES.ADMIN && clientId) {
    where.clientId = clientId;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Property.findAndCountAll({
    where,
    include: [clientInclude],
    order: [['createdAt', 'DESC']],
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

function resolveBasePrice(property) {
  const price = Number(property.defaultCleaningPrice);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

async function syncCalendar(propertyId, locale = 'pt') {
  const property = await Property.findByPk(propertyId);

  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }

  if (property.status !== PROPERTY_STATUSES.ACTIVE) {
    throw new AppError(t('PROPERTY_INACTIVE', locale), 400, 'PROPERTY_INACTIVE');
  }

  if (!property.icalUrl) {
    throw new AppError(t('PROPERTY_NO_ICAL_URL', locale), 400, 'PROPERTY_NO_ICAL_URL');
  }

  const events = await icalProvider.fetchAndParse(property.icalUrl);
  const basePrice = resolveBasePrice(property);

  let created = 0;
  let skipped = 0;
  const createdOrders = [];

  for (const event of events) {
    const scheduledDate = event.checkOut;

    if (!scheduledDate) {
      skipped += 1;
      continue;
    }

    const existing = await ServiceOrder.findOne({
      where: {
        propertyId: property.id,
        scheduledDate,
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    try {
      const order = await ServiceOrder.create({
        propertyId: property.id,
        scheduledDate,
        status: SERVICE_ORDER_STATUSES.PENDING,
        beforePhotos: [],
        afterPhotos: [],
        basePrice,
        extrasTotalPrice: 0,
        totalPrice: basePrice,
      });

      created += 1;
      createdOrders.push(order);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return {
    propertyId: property.id,
    totalEvents: events.length,
    created,
    skipped,
    basePriceApplied: basePrice,
    orders: createdOrders,
  };
}

async function listSyncableProperties() {
  return Property.findAll({
    where: {
      status: PROPERTY_STATUSES.ACTIVE,
      icalUrl: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
      },
    },
  });
}

module.exports = {
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyById,
  listProperties,
  syncCalendar,
  listSyncableProperties,
};
