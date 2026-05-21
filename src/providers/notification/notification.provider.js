const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const config = require('../../config');
const { getSocketCorsOptions } = require('../../middlewares/cors.middleware');
const { User } = require('../../models');
const { USER_ROLES } = require('../../config/constants');

const NOTIFICATION_EVENTS = {
  ORDER_CHECKIN: 'ORDER_CHECKIN',
  INVENTORY_CRITICAL: 'INVENTORY_CRITICAL',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  ORDER_ASSIGNED: 'ORDER_ASSIGNED',
};

let io = null;
const userSockets = new Map();
const socketMeta = new Map();

function addConnection(userId, socketId, role) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
  socketMeta.set(socketId, { userId, role });
}

function removeConnection(socketId) {
  const meta = socketMeta.get(socketId);
  if (!meta) return;

  const sockets = userSockets.get(meta.userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(meta.userId);
    }
  }
  socketMeta.delete(socketId);
}

function emitToSocketIds(socketIds, event, payload) {
  if (!io) return;

  for (const socketId of socketIds) {
    io.to(socketId).emit(event, payload);
  }
}

function emitToUser(userId, event, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;

  emitToSocketIds(sockets, event, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

function emitToRole(role, event, payload) {
  if (!io) return;

  const targetSocketIds = [];

  for (const [socketId, meta] of socketMeta.entries()) {
    if (meta.role === role) {
      targetSocketIds.push(socketId);
    }
  }

  emitToSocketIds(targetSocketIds, event, {
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

function emitToAdmins(event, payload) {
  emitToRole(USER_ROLES.ADMIN, event, payload);
}

function notifyOrderAssigned(order, provider) {
  if (!provider?.id) return;

  emitToUser(provider.id, 'notification', {
    type: NOTIFICATION_EVENTS.ORDER_ASSIGNED,
    title: 'Nova OS atribuída',
    message: `Limpeza agendada em ${order.property?.name || 'propriedade'}.`,
    data: {
      serviceOrderId: order.id,
      propertyId: order.propertyId,
      providerId: provider.id,
      scheduledDate: order.scheduledDate,
    },
  });
}

function notifyOrderCheckIn(order, provider) {
  emitToAdmins('notification', {
    type: NOTIFICATION_EVENTS.ORDER_CHECKIN,
    title: 'Check-in realizado',
    message: `${provider?.name || 'Prestador'} iniciou limpeza em ${order.property?.name || 'propriedade'}.`,
    data: {
      serviceOrderId: order.id,
      propertyId: order.propertyId,
      providerId: order.providerId,
    },
  });
}

function notifyInventoryCritical(item, property) {
  const payload = {
    type: NOTIFICATION_EVENTS.INVENTORY_CRITICAL,
    title: 'Estoque crítico',
    message: `Item "${item.name}" atingiu nível crítico em ${property?.name || 'propriedade'}.`,
    data: {
      inventoryItemId: item.id,
      propertyId: item.propertyId,
      currentQuantity: item.currentQuantity,
      criticalLevel: item.criticalLevel,
    },
  };

  emitToAdmins('notification', payload);

  if (property?.clientId) {
    emitToUser(property.clientId, 'notification', payload);
  }
}

function notifyOrderCompleted(order, property) {
  if (!property?.clientId) return;

  emitToUser(property.clientId, 'notification', {
    type: NOTIFICATION_EVENTS.ORDER_COMPLETED,
    title: 'Limpeza concluída',
    message: `A ordem de serviço em ${property.name} foi finalizada.`,
    data: {
      serviceOrderId: order.id,
      propertyId: order.propertyId,
      finishedAt: order.finishedAt,
    },
  });
}

function forceLogoutUser(userId, reason = 'ACCOUNT_DEACTIVATED') {
  const sockets = userSockets.get(userId);
  if (!sockets || !io) return;

  emitToSocketIds(sockets, 'force_logout', {
    reason,
    message: 'Sua sessão foi encerrada.',
  });

  for (const socketId of [...sockets]) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
    removeConnection(socketId);
  }
}

async function authenticateSocket(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'role', 'active', 'name'],
    });

    if (!user || !user.active) {
      return next(new Error('UNAUTHORIZED'));
    }

    socket.user = user;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}

function init(httpServer) {
  io = new Server(httpServer, {
    cors: getSocketCorsOptions(),
    path: '/socket.io',
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    addConnection(socket.user.id, socket.id, socket.user.role);

    socket.emit('connected', {
      userId: socket.user.id,
      role: socket.user.role,
    });

    socket.on('disconnect', () => {
      removeConnection(socket.id);
    });
  });

  console.log('[socket.io] Notification provider initialized');
  return io;
}

function getIo() {
  return io;
}

module.exports = {
  init,
  getIo,
  emitToUser,
  emitToRole,
  emitToAdmins,
  notifyOrderCheckIn,
  notifyOrderAssigned,
  notifyInventoryCritical,
  notifyOrderCompleted,
  forceLogoutUser,
  NOTIFICATION_EVENTS,
};
