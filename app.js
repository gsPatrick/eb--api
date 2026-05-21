require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./src/config');
const apiRoutes = require('./src/routes');
const rootRoutes = require('./src/routes/root.routes');
const { errorHandler, notFoundHandler } = require('./src/middlewares/error.middleware');
const { localeMiddleware } = require('./src/middlewares/locale.middleware');
const { sequelize } = require('./src/models');
const { startScheduledSync } = require('./src/features/property/property-sync.service');
const { ensureUploadDir, ensureAvatarDir } = require('./src/utils/storage');
const notificationProvider = require('./src/providers/notification/notification.provider');

ensureUploadDir();
ensureAvatarDir();

const app = express();
const server = http.createServer(app);

app.set('trust proxy', config.trustProxy);

app.use(helmet());
app.use(cors(config.cors.options));
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

    notificationProvider.init(server);
    startScheduledSync();

    server.listen(config.port, () => {
      console.log(`[server] EB API running on port ${config.port}`);
      console.log(`[server] API prefix: ${config.apiPrefix}`);
      console.log(`[server] WebSocket path: /socket.io`);
      console.log(`[server] Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('[db] Unable to connect to PostgreSQL:', error.message);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
