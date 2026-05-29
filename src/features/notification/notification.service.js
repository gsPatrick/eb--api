const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { Notification } = require('../../models');

async function listNotifications({ userId, unreadOnly, page = 1, limit = 30, locale }) {
  const where = { userId };

  if (unreadOnly) {
    where.readAt = null;
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
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

async function getUnreadCount(userId) {
  const unreadCount = await Notification.count({
    where: { userId, readAt: null },
  });
  return { unreadCount };
}

async function markAsRead(notificationId, userId, locale) {
  const notification = await Notification.findByPk(notificationId);

  if (!notification) {
    throw new AppError(t('NOTIFICATION_NOT_FOUND', locale), 404, 'NOTIFICATION_NOT_FOUND');
  }

  if (notification.userId !== userId) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  if (!notification.readAt) {
    await notification.update({ readAt: new Date() });
  }

  return notification;
}

async function markAllAsRead(userId) {
  await Notification.update(
    { readAt: new Date() },
    { where: { userId, readAt: null } }
  );
  return { success: true };
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
