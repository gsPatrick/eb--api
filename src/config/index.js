const { DEFAULT_LOCALE } = require('./constants');

function parseCorsOrigins(value) {
  if (!value || value.trim() === '*' || value.trim().toLowerCase() === 'all') {
    return { allowAll: true };
  }

  const trimmed = value.trim();
  if (trimmed.toLowerCase() === 'false' || trimmed.toLowerCase() === 'off') {
    return { allowAll: false, origins: [] };
  }

  return {
    allowAll: false,
    origins: value.split(',').map((origin) => origin.trim()).filter(Boolean),
  };
}

function parseTrustProxy(value, env) {
  if (value === undefined || value === '') {
    return env === 'production' ? 1 : false;
  }

  if (value === 'true') {
    return 1;
  }

  if (value === 'false') {
    return false;
  }

  const hops = Number(value);
  return Number.isNaN(hops) ? value : hops;
}

function buildCorsOptions(corsConfig) {
  if (corsConfig.allowAll) {
    return { origin: '*' };
  }

  return {
    origin: corsConfig.origins,
    credentials: true,
  };
}

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  port: Number(process.env.PORT) || 3000,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, env),
  apiPrefix: process.env.APP_API_PREFIX || '/api',
  defaultLocale: process.env.DEFAULT_LOCALE || DEFAULT_LOCALE,
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: (() => {
    const parsed = parseCorsOrigins(process.env.CORS_ORIGINS);
    return {
      ...parsed,
      options: buildCorsOptions(parsed),
    };
  })(),
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true' && env !== 'test',
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },
  requestLog: {
    enabled: process.env.REQUEST_LOG !== 'false',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'eb_services',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    migrateOnStart: process.env.DB_MIGRATE_ON_START !== 'false' && env !== 'test',
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
  adminBootstrap: {
    enabled: process.env.ADMIN_BOOTSTRAP !== 'false' && env !== 'test',
    name: process.env.ADMIN_NAME || 'EB Admin',
    email: process.env.ADMIN_EMAIL || 'admin@ebservices.local',
    password: process.env.ADMIN_PASSWORD || 'Admin@EB2026',
    locale: process.env.ADMIN_LOCALE || 'pt',
  },
  testProviderBootstrap: {
    enabled: process.env.TEST_PROVIDER_BOOTSTRAP !== 'false' && env !== 'test',
    name: process.env.TEST_PROVIDER_NAME || 'Patrick Prestador',
    email: process.env.TEST_PROVIDER_EMAIL || 'patrickprestador@gmail.com',
    password: process.env.TEST_PROVIDER_PASSWORD || 'patrickprestador',
    locale: process.env.TEST_PROVIDER_LOCALE || 'pt',
  },
  testClientBootstrap: {
    enabled: process.env.TEST_CLIENT_BOOTSTRAP !== 'false' && env !== 'test',
    name: process.env.TEST_CLIENT_NAME || 'Patrick Cliente',
    email: process.env.TEST_CLIENT_EMAIL || 'patrickcliente@gmail.com',
    password: process.env.TEST_CLIENT_PASSWORD || 'patrickcliente',
    locale: process.env.TEST_CLIENT_LOCALE || 'pt',
  },
  testDemoBootstrap: {
    enabled: process.env.TEST_DEMO_BOOTSTRAP !== 'false' && env !== 'test',
  },
};

module.exports = config;
