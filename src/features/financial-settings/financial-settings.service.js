const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { readSettings, writeSettings } = require('./financial-settings.store');

const ALLOWED_FIELDS = [
  'companyName',
  'companyEmail',
  'companyPhone',
  'companyAddress',
  'zelle',
  'venmo',
  'logoUrl',
  'invoiceDueDays',
  'invoiceFooter',
  'receiptFooter',
  'documentDisclaimer',
];

function sanitizePayload(payload = {}) {
  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (payload[field] !== undefined) {
      updates[field] = String(payload[field] ?? '').trim();
    }
  }
  return updates;
}

async function getFinancialSettings() {
  return readSettings();
}

async function updateFinancialSettings(payload, locale) {
  const updates = sanitizePayload(payload);
  if (!Object.keys(updates).length) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR');
  }
  if (updates.companyName !== undefined && !updates.companyName) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['companyName'],
    });
  }
  if (updates.invoiceDueDays !== undefined) {
    updates.invoiceDueDays = Number(updates.invoiceDueDays) || 14;
  }
  return writeSettings(updates);
}

module.exports = {
  getFinancialSettings,
  updateFinancialSettings,
};
