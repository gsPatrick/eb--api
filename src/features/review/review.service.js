const { fn, col } = require('sequelize');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const {
  USER_ROLES,
  SERVICE_ORDER_STATUSES,
  REVIEW_RATING_MIN,
  REVIEW_RATING_MAX,
  SUPPORTED_LOCALES,
} = require('../../config/constants');
const { Review, ServiceOrder, Property, User } = require('../../models');

const reviewIncludes = [
  {
    model: ServiceOrder,
    as: 'serviceOrder',
    attributes: ['id', 'scheduledDate', 'status', 'propertyId', 'providerId'],
    include: [
      {
        model: Property,
        as: 'property',
        attributes: ['id', 'name', 'clientId'],
      },
    ],
  },
  {
    model: User,
    as: 'reviewer',
    attributes: ['id', 'name', 'email', 'role'],
  },
  {
    model: User,
    as: 'reviewed',
    attributes: ['id', 'name', 'email', 'role'],
  },
];

async function getReviewOrFail(id, locale) {
  const review = await Review.findByPk(id, { include: reviewIncludes });

  if (!review) {
    throw new AppError(t('REVIEW_NOT_FOUND', locale), 404, 'REVIEW_NOT_FOUND');
  }

  return review;
}

function assertReviewReadable(review, actor, locale) {
  if (actor.role === USER_ROLES.ADMIN) {
    return;
  }

  if (actor.role === USER_ROLES.CLIENT && review.reviewerId === actor.id) {
    return;
  }

  throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
}

async function listReviews({ actor, page = 1, limit = 20, locale }) {
  const where = {};

  if (actor.role === USER_ROLES.CLIENT) {
    where.reviewerId = actor.id;
  } else if (actor.role !== USER_ROLES.ADMIN) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await Review.findAndCountAll({
    where,
    include: reviewIncludes,
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

async function getReviewById(id, actor, locale) {
  const review = await getReviewOrFail(id, locale);
  assertReviewReadable(review, actor, locale);
  return review;
}

async function createReview(payload, actor, locale) {
  if (actor.role !== USER_ROLES.CLIENT) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  const { serviceOrderId, rating, comment } = payload;

  if (!serviceOrderId || rating === undefined) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['serviceOrderId', 'rating'],
    });
  }

  const numericRating = Number(rating);
  if (
    !Number.isInteger(numericRating) ||
    numericRating < REVIEW_RATING_MIN ||
    numericRating > REVIEW_RATING_MAX
  ) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['rating'],
    });
  }

  const order = await ServiceOrder.findByPk(serviceOrderId, {
    include: [{ model: Property, as: 'property' }],
  });

  if (!order) {
    throw new AppError(t('SERVICE_ORDER_NOT_FOUND', locale), 404, 'SERVICE_ORDER_NOT_FOUND');
  }

  if (order.status !== SERVICE_ORDER_STATUSES.COMPLETED) {
    throw new AppError(t('REVIEW_ORDER_NOT_COMPLETED', locale), 400, 'REVIEW_ORDER_NOT_COMPLETED');
  }

  if (order.property?.clientId !== actor.id) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN');
  }

  if (!order.providerId) {
    throw new AppError(t('REVIEW_NO_PROVIDER', locale), 400, 'REVIEW_NO_PROVIDER');
  }

  try {
    const review = await Review.create({
      serviceOrderId: order.id,
      reviewerId: actor.id,
      reviewedId: order.providerId,
      rating: numericRating,
      comment: comment || null,
    });

    return getReviewOrFail(review.id, locale);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(t('REVIEW_ALREADY_EXISTS', locale), 409, 'REVIEW_ALREADY_EXISTS');
    }
    throw error;
  }
}

async function updateReview(id, payload, locale) {
  const review = await getReviewOrFail(id, locale);

  const updates = {};
  if (payload.rating !== undefined) {
    const numericRating = Number(payload.rating);
    if (
      !Number.isInteger(numericRating) ||
      numericRating < REVIEW_RATING_MIN ||
      numericRating > REVIEW_RATING_MAX
    ) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['rating'],
      });
    }
    updates.rating = numericRating;
  }
  if (payload.comment !== undefined) updates.comment = payload.comment;

  await review.update(updates);
  return getReviewOrFail(id, locale);
}

async function deleteReview(id, locale) {
  const review = await getReviewOrFail(id, locale);
  await review.destroy();
}

module.exports = {
  listReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
};
