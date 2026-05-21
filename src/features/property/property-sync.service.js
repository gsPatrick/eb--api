const cron = require('node-cron');
const config = require('../../config');
const propertyService = require('./property.service');
const { logCriticalError } = require('../../utils/logger');

let scheduledTask = null;

async function runSyncAll() {
  const properties = await propertyService.listSyncableProperties();

  console.log(`[ical-sync] Starting sync for ${properties.length} propert(ies)`);

  const results = [];

  for (const property of properties) {
    try {
      const result = await propertyService.syncCalendar(property.id);
      results.push({ propertyId: property.id, success: true, ...result });
      console.log(
        `[ical-sync] Property ${property.id}: ${result.created} created, ${result.skipped} skipped`
      );
    } catch (error) {
      logCriticalError('ical-sync', error.message, {
        propertyId: property.id,
        code: error.code || 'SYNC_FAILED',
        stack: error.stack,
      });

      results.push({
        propertyId: property.id,
        success: false,
        error: error.message,
        code: error.code || 'SYNC_FAILED',
      });
      console.error(`[ical-sync] Property ${property.id} failed:`, error.message);
    }
  }

  return results;
}

function startScheduledSync() {
  if (!config.icalSync.enabled) {
    console.log('[ical-sync] Scheduled sync disabled (ICAL_SYNC_ENABLED=false)');
    return null;
  }

  if (!cron.validate(config.icalSync.cron)) {
    console.error(`[ical-sync] Invalid cron expression: ${config.icalSync.cron}`);
    return null;
  }

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(config.icalSync.cron, () => {
    runSyncAll().catch((error) => {
      logCriticalError('ical-sync', error.message, { scope: 'scheduled-run', stack: error.stack });
      console.error('[ical-sync] Scheduled run failed:', error.message);
    });
  });

  console.log(`[ical-sync] Scheduled with cron: ${config.icalSync.cron}`);
  return scheduledTask;
}

function stopScheduledSync() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  runSyncAll,
  startScheduledSync,
  stopScheduledSync,
};
