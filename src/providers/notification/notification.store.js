const { Notification } = require('../../models');

async function persistNotification(userId, payload) {
  if (!userId) return null;

  return Notification.create({
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data || {},
  });
}

async function persistForUsers(userIds, payload) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  await Promise.all(uniqueIds.map((userId) => persistNotification(userId, payload)));
}

module.exports = {
  persistNotification,
  persistForUsers,
};
