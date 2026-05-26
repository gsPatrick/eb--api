const catchAsync = require('../../utils/catch-async');
const AppError = require('../../utils/app-error');
const { sendSuccess, sendCreated } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const { processAvatarFile } = require('../../utils/storage');
const userService = require('./user.service');

const register = catchAsync(async (req, res) => {
  const user = await userService.registerUser(
    { ...req.body, locale: req.locale },
    req.locale
  );

  sendCreated(res, { data: { user } });
});

const createAdmin = catchAsync(async (req, res) => {
  const user = await userService.createAdminUser(req.body, req.locale);
  sendCreated(res, { data: { user } });
});

const login = catchAsync(async (req, res) => {
  const result = await userService.authenticateUser({
    ...req.body,
    locale: req.locale,
  });

  sendSuccess(res, { data: result });
});

const getMe = catchAsync(async (req, res) => {
  sendSuccess(res, { data: { user: req.user.toSafeJSON() } });
});

const updateMe = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body, req.locale);
  sendSuccess(res, {
    message: t('PROFILE_UPDATED_SUCCESS', req.locale),
    data: { user },
  });
});

const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError(t('VALIDATION_ERROR', req.locale), 400, 'VALIDATION_ERROR', {
      fields: ['avatar'],
    });
  }

  const avatarUrl = processAvatarFile(req.file);
  const user = await userService.updateAvatar(req.user.id, avatarUrl, req.locale);

  sendSuccess(res, {
    message: t('AVATAR_UPDATED_SUCCESS', req.locale),
    data: { user },
  });
});

const getProviderRating = catchAsync(async (req, res) => {
  const rating = await userService.getProviderAverageRating(req.params.id, req.locale);
  sendSuccess(res, { data: rating });
});

const getById = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.id, req.locale);
  sendSuccess(res, { data: { user } });
});

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { role, active, search } = req.query;

  const result = await userService.listUsers({ role, active, search, page, limit });
  sendSuccess(res, { data: result.items, meta: result.meta });
});

const updateStatus = catchAsync(async (req, res) => {
  const user = await userService.updateUserStatus(
    req.params.id,
    req.body.active,
    req.user.id,
    req.locale
  );

  sendSuccess(res, {
    message: t('USER_STATUS_UPDATED_SUCCESS', req.locale),
    data: { user },
  });
});

const updateRole = catchAsync(async (req, res) => {
  const user = await userService.updateUserRole(
    req.params.id,
    req.body.role,
    req.user.id,
    req.locale
  );

  sendSuccess(res, {
    message: t('USER_ROLE_UPDATED_SUCCESS', req.locale),
    data: { user },
  });
});

module.exports = {
  register,
  createAdmin,
  login,
  getMe,
  updateMe,
  updateAvatar,
  getProviderRating,
  getById,
  list,
  updateStatus,
  updateRole,
};
