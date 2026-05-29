const fs = require('fs');
const path = require('path');
const config = require('../../config');

const SETTINGS_DIR = path.join(process.cwd(), 'public', 'uploads', 'settings');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'financial.json');

function defaultSettings() {
  const company = config.company || {};
  return {
    companyName: company.name || 'EB Services and Solutions',
    companyEmail: company.email || '',
    companyPhone: company.phone || '',
    companyAddress: company.address || '',
    zelle: company.zelle || '',
    invoiceFooter:
      'Payment methods: Zelle or check. Thank you for choosing EB Services and Solutions.',
    receiptFooter: 'Payment recorded manually by EB Services admin.',
    documentDisclaimer: '',
  };
}

function ensureDir() {
  fs.mkdirSync(SETTINGS_DIR, { recursive: true });
}

function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return defaultSettings();
    }
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

function writeSettings(payload) {
  ensureDir();
  const current = readSettings();
  const next = { ...current, ...payload };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

module.exports = {
  readSettings,
  writeSettings,
  defaultSettings,
};
