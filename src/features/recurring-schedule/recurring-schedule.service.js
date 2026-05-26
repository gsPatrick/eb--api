const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const {
  USER_ROLES,
  CLEANING_TYPES,
  RECURRENCE_FREQUENCIES,
  PROPERTY_STATUSES,
} = require('../../config/constants');
const { RecurringSchedule, Property, User, ServiceOrder } = require('../../models');
const serviceOrderService = require('../service-order/service-order.service');

const includes = [
  {
    model: Property,
    as: 'property',
    attributes: ['id', 'name', 'address', 'clientId', 'defaultCleaningPrice', 'status'],
  },
  { model: User, as: 'provider', attributes: ['id', 'name', 'email'] },
];

function parseDateOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateStr, months) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function computeInitialNextRunDate({ startDate, frequency, dayOfWeek, dayOfMonth }) {
  let candidate = parseDateOnly(startDate);
  const start = new Date(`${candidate}T12:00:00Z`);

  if (frequency === RECURRENCE_FREQUENCIES.MONTHLY) {
    const dom = dayOfMonth || start.getUTCDate();
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    candidate = new Date(Date.UTC(year, month, dom)).toISOString().slice(0, 10);
    if (candidate < parseDateOnly(startDate)) {
      candidate = addMonths(candidate, 1);
    }
    return candidate;
  }

  const targetDow = dayOfWeek ?? start.getUTCDay();
  let cursor = new Date(`${candidate}T12:00:00Z`);
  while (cursor.getUTCDay() !== targetDow) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  candidate = cursor.toISOString().slice(0, 10);
  if (candidate < parseDateOnly(startDate)) {
    candidate = addDays(candidate, 7);
  }
  return candidate;
}

function computeNextRunDate(schedule, fromDate) {
  const base = parseDateOnly(fromDate || schedule.nextRunDate);

  if (schedule.frequency === RECURRENCE_FREQUENCIES.WEEKLY) {
    return addDays(base, 7);
  }
  if (schedule.frequency === RECURRENCE_FREQUENCIES.BIWEEKLY) {
    return addDays(base, 14);
  }
  return addMonths(base, 1);
}

function isValidCleaningType(type) {
  return Object.values(CLEANING_TYPES).includes(type);
}

function isValidFrequency(frequency) {
  return Object.values(RECURRENCE_FREQUENCIES).includes(frequency);
}

async function listSchedules({ propertyId, active, page = 1, limit = 50, locale }) {
  const where = {};

  if (propertyId) where.propertyId = propertyId;
  if (active !== undefined) where.active = active === true || active === 'true';

  const offset = (page - 1) * limit;

  const { rows, count } = await RecurringSchedule.findAndCountAll({
    where,
    include: includes,
    order: [['nextRunDate', 'ASC']],
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

async function createSchedule(payload, locale) {
  const {
    propertyId,
    providerId,
    cleaningType,
    estimatedDurationMinutes,
    frequency,
    dayOfWeek,
    dayOfMonth,
    startDate,
    endDate,
    basePrice,
    active,
  } = payload;

  if (!propertyId || !frequency || !startDate) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['propertyId', 'frequency', 'startDate'],
    });
  }

  if (!isValidFrequency(frequency)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['frequency'],
    });
  }

  const resolvedCleaningType = cleaningType || CLEANING_TYPES.REGULAR;
  if (!isValidCleaningType(resolvedCleaningType)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['cleaningType'],
    });
  }

  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new AppError(t('PROPERTY_NOT_FOUND', locale), 404, 'PROPERTY_NOT_FOUND');
  }
  if (property.status !== PROPERTY_STATUSES.ACTIVE) {
    throw new AppError(t('PROPERTY_INACTIVE', locale), 400, 'PROPERTY_INACTIVE');
  }

  if (providerId) {
    const provider = await User.findByPk(providerId);
    if (!provider || provider.role !== USER_ROLES.PROVIDER || !provider.active) {
      throw new AppError(t('INVALID_PROVIDER', locale), 400, 'INVALID_PROVIDER');
    }
  }

  const nextRunDate = computeInitialNextRunDate({
    startDate,
    frequency,
    dayOfWeek,
    dayOfMonth,
  });

  const schedule = await RecurringSchedule.create({
    propertyId,
    providerId: providerId || null,
    cleaningType: resolvedCleaningType,
    estimatedDurationMinutes: estimatedDurationMinutes || null,
    frequency,
    dayOfWeek: dayOfWeek ?? null,
    dayOfMonth: dayOfMonth ?? null,
    startDate: parseDateOnly(startDate),
    endDate: endDate ? parseDateOnly(endDate) : null,
    nextRunDate,
    basePrice: basePrice ?? null,
    active: active !== false,
  });

  return RecurringSchedule.findByPk(schedule.id, { include: includes });
}

async function updateSchedule(id, payload, locale) {
  const schedule = await RecurringSchedule.findByPk(id);
  if (!schedule) {
    throw new AppError(t('RECURRING_SCHEDULE_NOT_FOUND', locale), 404, 'RECURRING_SCHEDULE_NOT_FOUND');
  }

  const updates = {};

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

  if (payload.cleaningType !== undefined) {
    if (!isValidCleaningType(payload.cleaningType)) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['cleaningType'],
      });
    }
    updates.cleaningType = payload.cleaningType;
  }

  if (payload.estimatedDurationMinutes !== undefined) {
    updates.estimatedDurationMinutes = payload.estimatedDurationMinutes || null;
  }

  if (payload.frequency !== undefined) {
    if (!isValidFrequency(payload.frequency)) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['frequency'],
      });
    }
    updates.frequency = payload.frequency;
  }

  if (payload.dayOfWeek !== undefined) updates.dayOfWeek = payload.dayOfWeek;
  if (payload.dayOfMonth !== undefined) updates.dayOfMonth = payload.dayOfMonth;
  if (payload.startDate !== undefined) updates.startDate = parseDateOnly(payload.startDate);
  if (payload.endDate !== undefined) {
    updates.endDate = payload.endDate ? parseDateOnly(payload.endDate) : null;
  }
  if (payload.basePrice !== undefined) updates.basePrice = payload.basePrice;
  if (payload.active !== undefined) updates.active = Boolean(payload.active);

  if (payload.nextRunDate !== undefined) {
    updates.nextRunDate = parseDateOnly(payload.nextRunDate);
  }

  await schedule.update(updates);
  return RecurringSchedule.findByPk(schedule.id, { include: includes });
}

async function removeSchedule(id, locale) {
  const schedule = await RecurringSchedule.findByPk(id);
  if (!schedule) {
    throw new AppError(t('RECURRING_SCHEDULE_NOT_FOUND', locale), 404, 'RECURRING_SCHEDULE_NOT_FOUND');
  }
  await schedule.destroy();
}

async function processDueSchedules(locale = 'en') {
  const today = new Date().toISOString().slice(0, 10);

  const schedules = await RecurringSchedule.findAll({
    where: { active: true, nextRunDate: { [require('sequelize').Op.lte]: today } },
    include: includes,
  });

  const results = [];

  for (const schedule of schedules) {
    try {
      if (schedule.endDate && schedule.nextRunDate > schedule.endDate) {
        await schedule.update({ active: false });
        results.push({ scheduleId: schedule.id, skipped: true, reason: 'ended' });
        continue;
      }

      const existing = await ServiceOrder.findOne({
        where: {
          propertyId: schedule.propertyId,
          scheduledDate: schedule.nextRunDate,
        },
      });

      if (!existing) {
        await serviceOrderService.createServiceOrder(
          {
            propertyId: schedule.propertyId,
            scheduledDate: schedule.nextRunDate,
            cleaningType: schedule.cleaningType,
            estimatedDurationMinutes: schedule.estimatedDurationMinutes,
            providerId: schedule.providerId,
            basePrice: schedule.basePrice,
          },
          locale
        );
      }

      const nextRunDate = computeNextRunDate(schedule, schedule.nextRunDate);
      const shouldDeactivate = schedule.endDate && nextRunDate > schedule.endDate;

      await schedule.update({
        nextRunDate,
        active: shouldDeactivate ? false : schedule.active,
      });

      results.push({ scheduleId: schedule.id, created: !existing, nextRunDate });
    } catch (error) {
      results.push({
        scheduleId: schedule.id,
        error: error.message,
        code: error.code || 'SCHEDULE_RUN_FAILED',
      });
    }
  }

  return results;
}

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  removeSchedule,
  processDueSchedules,
  computeNextRunDate,
};
