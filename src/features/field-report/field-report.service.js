const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const {
  USER_ROLES,
  FIELD_REPORT_TYPES,
  FIELD_REPORT_STATUSES,
  SERVICE_ORDER_STATUSES,
} = require('../../config/constants');
const { FieldReport, ServiceOrder, Property, User } = require('../../models');
const notificationProvider = require('../../providers/notification/notification.provider');

const includes = [
  { model: User, as: 'provider', attributes: ['id', 'name', 'email'] },
  { model: Property, as: 'property', attributes: ['id', 'name', 'address', 'clientId'] },
  {
    model: ServiceOrder,
    as: 'serviceOrder',
    attributes: ['id', 'scheduledDate', 'status'],
  },
  { model: User, as: 'resolvedBy', attributes: ['id', 'name'] },
];

function isValidReportType(type) {
  return Object.values(FIELD_REPORT_TYPES).includes(type);
}

async function assertOrderAccess(order, actor, locale) {
  if (actor.role === USER_ROLES.ADMIN) return;

  if (actor.role === USER_ROLES.PROVIDER) {
    if (order.providerId !== actor.id) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
    return;
  }

  if (actor.role === USER_ROLES.CLIENT) {
    const property = await Property.findByPk(order.propertyId);
    if (!property || property.clientId !== actor.id) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
  }
}

async function listFieldReports({ actor, status, propertyId, page = 1, limit = 30, locale }) {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (propertyId) {
    where.propertyId = propertyId;
  }

  const include = [...includes];

  if (actor.role === USER_ROLES.CLIENT) {
    include[1].where = { clientId: actor.id };
    include[1].required = true;
  } else if (actor.role === USER_ROLES.PROVIDER) {
    where.providerId = actor.id;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await FieldReport.findAndCountAll({
    where,
    include,
    order: [['createdAt', 'DESC']],
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

async function createFieldReport(actor, payload, photos, locale) {
  const { serviceOrderId, type, description } = payload;

  if (!serviceOrderId || !type || !description?.trim()) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['serviceOrderId', 'type', 'description'],
    });
  }

  if (!isValidReportType(type)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['type'],
    });
  }

  if (actor.role !== USER_ROLES.PROVIDER) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const order = await ServiceOrder.findByPk(serviceOrderId, {
    include: [{ model: Property, as: 'property' }],
  });

  if (!order) {
    throw new AppError(t('SERVICE_ORDER_NOT_FOUND', locale), 404, 'SERVICE_ORDER_NOT_FOUND');
  }

  if (order.providerId !== actor.id) {
    throw new AppError(t('SERVICE_ORDER_NOT_ASSIGNED', locale), 403, 'FORBIDDEN');
  }

  if (
    order.status !== SERVICE_ORDER_STATUSES.IN_PROGRESS &&
    order.status !== SERVICE_ORDER_STATUSES.PENDING
  ) {
    throw new AppError(t('SERVICE_ORDER_INVALID_STATUS', locale), 400, 'SERVICE_ORDER_INVALID_STATUS');
  }

  if (!photos || photos.length === 0) {
    throw new AppError(t('FIELD_REPORT_PHOTOS_REQUIRED', locale), 400, 'FIELD_REPORT_PHOTOS_REQUIRED');
  }

  const report = await FieldReport.create({
    serviceOrderId: order.id,
    providerId: actor.id,
    propertyId: order.propertyId,
    type,
    description: description.trim(),
    photos,
    status: FIELD_REPORT_STATUSES.OPEN,
  });

  const full = await FieldReport.findByPk(report.id, { include: includes });
  notificationProvider.notifyFieldReport(full, order.property);

  return full;
}

async function resolveFieldReport(reportId, actor, locale) {
  if (actor.role !== USER_ROLES.ADMIN) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const report = await FieldReport.findByPk(reportId);

  if (!report) {
    throw new AppError(t('FIELD_REPORT_NOT_FOUND', locale), 404, 'FIELD_REPORT_NOT_FOUND');
  }

  await report.update({
    status: FIELD_REPORT_STATUSES.RESOLVED,
    resolvedAt: new Date(),
    resolvedById: actor.id,
  });

  return FieldReport.findByPk(report.id, { include: includes });
}

module.exports = {
  listFieldReports,
  createFieldReport,
  resolveFieldReport,
};
