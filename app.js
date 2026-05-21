require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./src/config');
const { createCorsMiddleware, applyOpenCorsHeaders } = require('./src/middlewares/cors.middleware');
const { requestLogger } = require('./src/middlewares/request-logger.middleware');
const apiRoutes = require('./src/routes');
const rootRoutes = require('./src/routes/root.routes');
const { errorHandler, notFoundHandler } = require('./src/middlewares/error.middleware');
const { localeMiddleware } = require('./src/middlewares/locale.middleware');
const { sequelize } = require('./src/models');
const { startScheduledSync } = require('./src/features/property/property-sync.service');
const { ensureUploadDir, ensureAvatarDir } = require('./src/utils/storage');
const notificationProvider = require('./src/providers/notification/notification.provider');
const { ensureDefaultAdmin } = require('./src/bootstrap/ensure-default-admin');
const { ensureTestProvider } = require('./src/bootstrap/ensure-test-provider');
const { ensureTestClient } = require('./src/bootstrap/ensure-test-client');
const { ensureTestDemoData } = require('./src/bootstrap/ensure-test-demo-data');
const { runMigrations } = require('./src/bootstrap/run-migrations');

ensureUploadDir();
ensureAvatarDir();

const app = express();
const server = http.createServer(app);

app.set('trust proxy', config.trustProxy);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(createCorsMiddleware());
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(localeMiddleware);

if (config.rateLimit.enabled) {
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        if (config.cors.allowAll) {
          applyOpenCorsHeaders(req, res);
        }
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        });
      },
    })
  );
}

app.use(rootRoutes);
app.use(config.apiPrefix, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[db] PostgreSQL connection established');

    await runMigrations();
    await ensureDefaultAdmin();
    await ensureTestProvider();
    await ensureTestClient();
    await ensureTestDemoData();

    notificationProvider.init(server);
    startScheduledSync();

    server.listen(config.port, () => {
      console.log(`[server] EB API running on port ${config.port}`);
      console.log(`[server] API prefix: ${config.apiPrefix}`);
      console.log(`[server] WebSocket path: /socket.io`);
      console.log(`[server] Environment: ${config.env}`);
      console.log(`[server] Rate limit: ${config.rateLimit.enabled ? 'enabled' : 'disabled'}`);
      console.log(`[server] Request log: ${config.requestLog.enabled ? 'enabled' : 'disabled'}`);
    });
  } catch (error) {
    console.error('[startup] Failed:', error.message);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
