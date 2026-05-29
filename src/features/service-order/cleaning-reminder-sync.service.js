const cron = require('node-cron');
const config = require('../../config');
const { ServiceOrder, Property, User } = require('../../models');
const { SERVICE_ORDER_STATUSES } = require('../../config/constants');
const serviceOrderService = require('../../features/service-order/service-order.service');
const { logCriticalError } = require('../../utils/logger');

let scheduledTask = null;

function getTomorrowDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

async function runCleaningReminders() {
  const tomorrow = getTomorrowDateString();

  const orders = await ServiceOrder.findAll({
    where: {
      status: SERVICE_ORDER_STATUSES.PENDING,
      scheduledDate: tomorrow,
      cleaningReminderSentAt: null,
    },
    include: [
      {
        model: Property,
        as: 'property',
        include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }],
      },
    ],
  });

  let sent = 0;
  for (const order of orders) {
    try {
      await serviceOrderService.sendCleaningReminder(order.id, 'pt');
      sent += 1;
    } catch (error) {
      console.error(`[cleaning-reminder] Failed for order ${order.id}:`, error.message);
    }
  }

  console.log(`[cleaning-reminder] Sent ${sent} reminder(s) for ${tomorrow}`);
  return { sent, date: tomorrow };
}

function startScheduledCleaningReminders() {
  const cronExpr = config.cleaningReminder?.cron || '0 9 * * *';

  if (config.cleaningReminder?.enabled === false) {
    console.log('[cleaning-reminder] Scheduled run disabled');
    return null;
  }

  if (!cron.validate(cronExpr)) {
    console.error(`[cleaning-reminder] Invalid cron: ${cronExpr}`);
    return null;
  }

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(cronExpr, () => {
    runCleaningReminders().catch((error) => {
      logCriticalError('cleaning-reminder', error.message, { stack: error.stack });
      console.error('[cleaning-reminder] Scheduled run failed:', error.message);
    });
  });

  console.log(`[cleaning-reminder] Scheduled with cron: ${cronExpr}`);
  return scheduledTask;
}

module.exports = {
  runCleaningReminders,
  startScheduledCleaningReminders,
};
