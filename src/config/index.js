const { DEFAULT_LOCALE } = require('./constants');

function parseCorsOrigins(value) {
  if (!value || value.trim() === '*') {
    return true;
  }

  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  apiPrefix: process.env.APP_API_PREFIX || '/api',
  defaultLocale: process.env.DEFAULT_LOCALE || DEFAULT_LOCALE,
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origins: parseCorsOrigins(process.env.CORS_ORIGINS),
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== 'test',
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'eb_services',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },
  icalSync: {
    enabled: process.env.ICAL_SYNC_ENABLED !== 'false',
    cron: process.env.ICAL_SYNC_CRON || '0 * * * *',
    fetchTimeoutMs: Number(process.env.ICAL_FETCH_TIMEOUT_MS) || 15000,
  },
  mail: {
    enabled: process.env.MAIL_ENABLED !== 'false',
    driver: process.env.MAIL_DRIVER || 'console',
    from: process.env.MAIL_FROM || 'noreply@ebservices.local',
  },
  socket: {
    path: process.env.SOCKET_PATH || '/socket.io',
  },
  geofence: {
    maxDistanceMeters: Number(process.env.GEOFENCE_MAX_DISTANCE_METERS) || 200,
  },
};

module.exports = config;
