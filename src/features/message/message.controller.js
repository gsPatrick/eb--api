const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const messageService = require('./message.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = await messageService.listMessages({
    actor: req.user,
    unreadOnly,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const unreadCount = catchAsync(async (req, res) => {
  const result = await messageService.getUnreadCount(req.user);
  sendSuccess(res, { data: result });
});

const create = catchAsync(async (req, res) => {
  const message = await messageService.createMessage(req.user, req.body, req.locale);
  sendCreated(res, {
    message: t('MESSAGE_SENT_SUCCESS', req.locale),
    data: { message },
  });
});

const markRead = catchAsync(async (req, res) => {
  const message = await messageService.markAsRead(req.params.id, req.user, req.locale);
  sendSuccess(res, { data: { message } });
});

module.exports = {
  list,
  unreadCount,
  create,
  markRead,
};
