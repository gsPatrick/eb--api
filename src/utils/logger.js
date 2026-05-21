const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logCriticalError(category, message, meta = {}) {
  ensureLogDir();

  const entry = {
    timestamp: new Date().toISOString(),
    level: 'critical',
    category,
    message,
    ...meta,
  };

  const line = `${JSON.stringify(entry)}\n`;
  fs.appendFileSync(ERROR_LOG_FILE, line, { encoding: 'utf8' });
}

module.exports = {
  logCriticalError,
  ERROR_LOG_FILE,
};
