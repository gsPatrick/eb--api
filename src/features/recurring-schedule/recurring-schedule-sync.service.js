const cron = require('node-cron');
const config = require('../../config');
const recurringScheduleService = require('./recurring-schedule.service');
const { logCriticalError } = require('../../utils/logger');

let scheduledTask = null;

async function runRecurringSchedules() {
  console.log('[recurring-schedule] Processing due schedules');
  const results = await recurringScheduleService.processDueSchedules('en');
  console.log(`[recurring-schedule] Processed ${results.length} schedule(s)`);
  return results;
}

function startScheduledRecurring() {
  if (!config.recurringSchedule.enabled) {
    console.log('[recurring-schedule] Scheduled run disabled');
    return null;
  }

  if (!cron.validate(config.recurringSchedule.cron)) {
    console.error(`[recurring-schedule] Invalid cron: ${config.recurringSchedule.cron}`);
    return null;
  }

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(config.recurringSchedule.cron, () => {
    runRecurringSchedules().catch((error) => {
      logCriticalError('recurring-schedule', error.message, { stack: error.stack });
      console.error('[recurring-schedule] Scheduled run failed:', error.message);
    });
  });

  console.log(`[recurring-schedule] Scheduled with cron: ${config.recurringSchedule.cron}`);
  return scheduledTask;
}

function stopScheduledRecurring() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  runRecurringSchedules,
  startScheduledRecurring,
  stopScheduledRecurring,
};
