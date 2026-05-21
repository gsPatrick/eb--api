const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const reviewService = require('./review.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await reviewService.listReviews({
    actor: req.user,
    page,
    limit,
    locale: req.locale,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const review = await reviewService.getReviewById(req.params.id, req.user, req.locale);
  sendSuccess(res, { data: { review } });
});

const create = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(req.body, req.user, req.locale);
  sendCreated(res, {
    message: t('REVIEW_CREATED_SUCCESS', req.locale),
    data: { review },
  });
});

const update = catchAsync(async (req, res) => {
  const review = await reviewService.updateReview(req.params.id, req.body, req.locale);
  sendSuccess(res, { data: { review } });
});

const remove = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.locale);
  sendNoContent(res);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
