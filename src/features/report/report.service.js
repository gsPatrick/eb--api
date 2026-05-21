const { Op } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { SERVICE_ORDER_STATUSES } = require('../../config/constants');
const {
  ServiceOrder,
  Property,
  User,
  ServiceOrderExtra,
  ServiceExtra,
} = require('../../models');

const orderIncludes = [
  {
    model: Property,
    as: 'property',
    attributes: ['id', 'name', 'address', 'clientId'],
    include: [
      {
        model: User,
        as: 'client',
        attributes: ['id', 'name', 'email'],
      },
    ],
  },
  {
    model: User,
    as: 'provider',
    attributes: ['id', 'name', 'email'],
  },
  {
    model: ServiceOrderExtra,
    as: 'extras',
    include: [
      {
        model: ServiceExtra,
        as: 'serviceExtra',
        attributes: ['id', 'name', 'defaultPrice'],
      },
    ],
  },
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateRange(startDate, endDate, locale) {
  if (!startDate || !endDate) {
    throw new AppError(t('REPORT_INVALID_DATE_RANGE', locale), 400, 'REPORT_INVALID_DATE_RANGE');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(t('REPORT_INVALID_DATE_RANGE', locale), 400, 'REPORT_INVALID_DATE_RANGE');
  }

  if (start > end) {
    throw new AppError(t('REPORT_INVALID_DATE_RANGE', locale), 400, 'REPORT_INVALID_DATE_RANGE');
  }

  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function getBillingReport({ startDate, endDate, clientId, locale }) {
  const { start, end } = parseDateRange(startDate, endDate, locale);

  const propertyWhere = {};
  if (clientId) {
    propertyWhere.clientId = clientId;
  }

  const orders = await ServiceOrder.findAll({
    where: {
      status: SERVICE_ORDER_STATUSES.COMPLETED,
      finishedAt: {
        [Op.between]: [start, end],
      },
    },
    include: [
      {
        ...orderIncludes[0],
        where: Object.keys(propertyWhere).length ? propertyWhere : undefined,
        required: true,
      },
      orderIncludes[1],
      orderIncludes[2],
    ],
    order: [['finishedAt', 'ASC']],
  });

  const totalAmount = orders.reduce((sum, order) => sum + toNumber(order.totalPrice), 0);

  const serviceOrders = orders.map((order) => ({
    id: order.id,
    scheduledDate: order.scheduledDate,
    finishedAt: order.finishedAt,
    status: order.status,
    basePrice: order.basePrice,
    extrasTotalPrice: order.extrasTotalPrice,
    totalPrice: order.totalPrice,
    beforePhotos: order.beforePhotos,
    afterPhotos: order.afterPhotos,
    property: order.property,
    provider: order.provider,
    extras: order.extras,
  }));

  return {
    period: {
      startDate,
      endDate,
    },
    clientId: clientId || null,
    totalAmount,
    orderCount: serviceOrders.length,
    serviceOrders,
  };
}

module.exports = {
  getBillingReport,
};
