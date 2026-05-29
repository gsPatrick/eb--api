const catchAsync = require('../../utils/catch-async');
const { sendSuccess } = require('../../utils/response');
const notificationService = require('./notification.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = await notificationService.listNotifications({
    userId: req.user.id,
    unreadOnly,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const unreadCount = catchAsync(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  sendSuccess(res, { data: result });
});

const markRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user.id,
    req.locale
  );
  sendSuccess(res, { data: { notification } });
});

const markAllRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  sendSuccess(res, { data: result });
});

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
};
