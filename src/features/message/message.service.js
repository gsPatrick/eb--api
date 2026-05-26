const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES } = require('../../config/constants');
const { InboxMessage, User, Property, ServiceOrder } = require('../../models');
const notificationProvider = require('../../providers/notification/notification.provider');

const MESSAGE_TYPES = {
  GENERAL: 'general',
  INVOICE: 'invoice',
  RECEIPT: 'receipt',
  REMINDER: 'reminder',
};

const userInclude = {
  model: User,
  as: 'sender',
  attributes: ['id', 'name', 'email', 'role'],
};

const recipientInclude = {
  model: User,
  as: 'recipient',
  attributes: ['id', 'name', 'email', 'role'],
};

const contextIncludes = [
  userInclude,
  recipientInclude,
  { model: Property, as: 'property', attributes: ['id', 'name'] },
  { model: ServiceOrder, as: 'serviceOrder', attributes: ['id', 'scheduledDate', 'status'] },
];

async function getDefaultAdminId() {
  const admin = await User.findOne({
    where: { role: USER_ROLES.ADMIN, active: true },
    order: [['createdAt', 'ASC']],
  });
  return admin?.id || null;
}

async function assertMessagingAllowed(sender, recipientId, locale) {
  const recipient = await User.findByPk(recipientId);

  if (!recipient || !recipient.active) {
    throw new AppError(t('USER_NOT_FOUND', locale), 404, 'USER_NOT_FOUND');
  }

  if (sender.role === USER_ROLES.ADMIN) {
    if (recipient.role !== USER_ROLES.CLIENT && recipient.role !== USER_ROLES.PROVIDER) {
      throw new AppError(t('MESSAGE_INVALID_RECIPIENT', locale), 400, 'MESSAGE_INVALID_RECIPIENT');
    }
    return recipient;
  }

  if (sender.role === USER_ROLES.CLIENT || sender.role === USER_ROLES.PROVIDER) {
    if (recipient.role !== USER_ROLES.ADMIN) {
      throw new AppError(t('MESSAGE_CLIENT_PROVIDER_TO_ADMIN_ONLY', locale), 403, 'FORBIDDEN');
    }
    return recipient;
  }

  throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
}

async function resolveRecipientId(actor, payloadRecipientId, locale) {
  if (actor.role === USER_ROLES.ADMIN) {
    if (!payloadRecipientId) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['recipientId'],
      });
    }
    return payloadRecipientId;
  }

  const adminId = await getDefaultAdminId();
  if (!adminId) {
    throw new AppError(t('MESSAGE_NO_ADMIN_AVAILABLE', locale), 503, 'MESSAGE_NO_ADMIN_AVAILABLE');
  }
  return adminId;
}

async function listMessages({ actor, unreadOnly, page = 1, limit = 30, locale }) {
  const { Op } = require('sequelize');
  const where = {};

  if (actor.role === USER_ROLES.ADMIN) {
    // Admin sees entire inbox
  } else {
    where[Op.or] = [{ senderId: actor.id }, { recipientId: actor.id }];
  }

  if (unreadOnly) {
    where.readAt = null;
    where.recipientId = actor.id;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await InboxMessage.findAndCountAll({
    where,
    include: contextIncludes,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  return {
    items: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

async function getUnreadCount(actor) {
  const count = await InboxMessage.count({
    where: {
      recipientId: actor.id,
      readAt: null,
    },
  });
  return { unreadCount: count };
}

async function createMessage(actor, payload, locale) {
  const {
    subject,
    body,
    serviceOrderId,
    propertyId,
    attachmentUrl,
    attachmentName,
    messageType = MESSAGE_TYPES.GENERAL,
  } = payload;

  if (!subject?.trim() || !body?.trim()) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['subject', 'body'],
    });
  }

  const recipientId = await resolveRecipientId(actor, payload.recipientId, locale);
  const recipient = await assertMessagingAllowed(actor, recipientId, locale);

  if (serviceOrderId) {
    const order = await ServiceOrder.findByPk(serviceOrderId, {
      include: [{ model: Property, as: 'property' }],
    });
    if (!order) {
      throw new AppError(t('SERVICE_ORDER_NOT_FOUND', locale), 404, 'SERVICE_ORDER_NOT_FOUND');
    }
    if (actor.role === USER_ROLES.CLIENT && order.property?.clientId !== actor.id) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
    if (actor.role === USER_ROLES.PROVIDER && order.providerId !== actor.id) {
      throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
    }
  }

  const safeMessageType = Object.values(MESSAGE_TYPES).includes(messageType)
    ? messageType
    : MESSAGE_TYPES.GENERAL;

  const message = await InboxMessage.create({
    senderId: actor.id,
    recipientId: recipient.id,
    subject: subject.trim(),
    body: body.trim(),
    serviceOrderId: serviceOrderId || null,
    propertyId: propertyId || null,
    messageType: safeMessageType,
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null,
  });

  const full = await InboxMessage.findByPk(message.id, { include: contextIncludes });
  notificationProvider.notifyInboxMessage(full, actor, recipient);

  return full;
}

async function createAutomatedInboxMessage({
  recipientId,
  subject,
  body,
  messageType = MESSAGE_TYPES.GENERAL,
  attachmentUrl = null,
  attachmentName = null,
  serviceOrderId = null,
  propertyId = null,
}) {
  const adminId = await getDefaultAdminId();
  if (!adminId || !recipientId) {
    return null;
  }

  const [admin, recipient] = await Promise.all([
    User.findByPk(adminId),
    User.findByPk(recipientId),
  ]);

  if (!admin || !recipient?.active) {
    return null;
  }

  const safeMessageType = Object.values(MESSAGE_TYPES).includes(messageType)
    ? messageType
    : MESSAGE_TYPES.GENERAL;

  const message = await InboxMessage.create({
    senderId: admin.id,
    recipientId: recipient.id,
    subject: subject.trim(),
    body: body.trim(),
    serviceOrderId: serviceOrderId || null,
    propertyId: propertyId || null,
    messageType: safeMessageType,
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null,
  });

  const full = await InboxMessage.findByPk(message.id, { include: contextIncludes });
  notificationProvider.notifyInboxMessage(full, admin, recipient);
  return full;
}

async function markAsRead(messageId, actor, locale) {
  const message = await InboxMessage.findByPk(messageId);

  if (!message) {
    throw new AppError(t('MESSAGE_NOT_FOUND', locale), 404, 'MESSAGE_NOT_FOUND');
  }

  if (message.recipientId !== actor.id && actor.role !== USER_ROLES.ADMIN) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  if (!message.readAt) {
    await message.update({ readAt: new Date() });
  }

  return InboxMessage.findByPk(message.id, { include: contextIncludes });
}

module.exports = {
  MESSAGE_TYPES,
  listMessages,
  getUnreadCount,
  createMessage,
  createAutomatedInboxMessage,
  markAsRead,
};
