const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES, SUPPORTED_LOCALES } = require('../../config/constants');
const { fn, col, Op } = require('sequelize');
const { User, Review } = require('../../models');
const notificationProvider = require('../../providers/notification/notification.provider');

const SALT_ROUNDS = 12;
const PUBLIC_REGISTER_ROLES = [USER_ROLES.CLIENT, USER_ROLES.PROVIDER];

function sanitizeUser(user) {
  return user.toSafeJSON ? user.toSafeJSON() : user;
}

function resolvePublicRegisterRole(requestedRole) {
  if (requestedRole && PUBLIC_REGISTER_ROLES.includes(requestedRole)) {
    return requestedRole;
  }
  return USER_ROLES.CLIENT;
}

async function registerUser(payload, locale) {
  const { name, email, password, phone, locale: userLocale } = payload;

  if (!name || !email || !password) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['name', 'email', 'password'],
    });
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new AppError(t('EMAIL_ALREADY_EXISTS', locale), 409, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const role = resolvePublicRegisterRole(payload.role);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    phone: phone || null,
    locale: userLocale || locale || 'pt',
    active: false,
  });

  return sanitizeUser(user);
}

async function createAdminUser(payload, locale) {
  const { name, email, password, phone, locale: userLocale } = payload;

  if (!name || !email || !password) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['name', 'email', 'password'],
    });
  }

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new AppError(t('EMAIL_ALREADY_EXISTS', locale), 409, 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: USER_ROLES.ADMIN,
    phone: phone || null,
    locale: userLocale || 'pt',
    active: true,
  });

  return sanitizeUser(user);
}

async function authenticateUser({ email, password, locale }) {
  if (!email || !password) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['email', 'password'],
    });
  }

  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    throw new AppError(t('INVALID_CREDENTIALS', locale), 401, 'INVALID_CREDENTIALS');
  }

  const isValid = await user.validatePassword(password);
  if (!isValid) {
    throw new AppError(t('INVALID_CREDENTIALS', locale), 401, 'INVALID_CREDENTIALS');
  }

  if (!user.active) {
    throw new AppError(t('FORBIDDEN', locale), 403, 'FORBIDDEN', {
      reason: 'USER_NOT_ACTIVE',
    });
  }

  await user.update({ lastLoginAt: new Date() });

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return {
    token,
    user: sanitizeUser(user),
  };
}

async function getUserById(id, locale) {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['passwordHash'] },
  });

  if (!user) {
    throw new AppError(t('USER_NOT_FOUND', locale), 404, 'USER_NOT_FOUND');
  }

  return sanitizeUser(user);
}

async function listUsers({ role, active, search, page = 1, limit = 20 }) {
  const where = {};
  if (role) where.role = role;
  if (active !== undefined) where.active = active === true || active === 'true';

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { email: { [Op.iLike]: term } },
    ];
  }

  const offset = (page - 1) * limit;

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['passwordHash'] },
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    items: rows.map(sanitizeUser),
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

async function updateUserStatus(userId, active, actorId, locale) {
  if (typeof active !== 'boolean') {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['active'],
    });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError(t('USER_NOT_FOUND', locale), 404, 'USER_NOT_FOUND');
  }

  if (user.id === actorId && !active) {
    throw new AppError(t('USER_CANNOT_DEACTIVATE_SELF', locale), 400, 'USER_CANNOT_DEACTIVATE_SELF');
  }

  if (user.role === USER_ROLES.ADMIN && !active) {
    const activeAdmins = await User.count({
      where: { role: USER_ROLES.ADMIN, active: true },
    });

    if (activeAdmins <= 1) {
      throw new AppError(t('USER_LAST_ADMIN', locale), 400, 'USER_LAST_ADMIN');
    }
  }

  await user.update({ active });

  if (!active) {
    notificationProvider.forceLogoutUser(user.id);
  }

  return sanitizeUser(user);
}

async function updateUserRole(userId, role, actorId, locale) {
  if (!Object.values(USER_ROLES).includes(role)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['role'],
    });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError(t('USER_NOT_FOUND', locale), 404, 'USER_NOT_FOUND');
  }

  if (user.id === actorId && user.role === USER_ROLES.ADMIN && role !== USER_ROLES.ADMIN) {
    const activeAdmins = await User.count({
      where: { role: USER_ROLES.ADMIN, active: true },
    });

    if (activeAdmins <= 1) {
      throw new AppError(t('USER_LAST_ADMIN', locale), 400, 'USER_LAST_ADMIN');
    }
  }

  if (user.role === USER_ROLES.ADMIN && role !== USER_ROLES.ADMIN) {
    const activeAdmins = await User.count({
      where: { role: USER_ROLES.ADMIN, active: true },
    });

    if (activeAdmins <= 1) {
      throw new AppError(t('USER_LAST_ADMIN', locale), 400, 'USER_LAST_ADMIN');
    }
  }

  await user.update({ role });
  return sanitizeUser(user);
}

async function updateProfile(userId, payload, locale) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError(t('USER_NOT_FOUND', locale), 404, 'USER_NOT_FOUND');
  }

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.phone !== undefined) updates.phone = payload.phone;
  if (payload.locale !== undefined) {
    if (!SUPPORTED_LOCALES.includes(payload.locale)) {
      throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
        fields: ['locale'],
      });
    }
    updates.locale = payload.locale;
  }

  await user.update(updates);
  return sanitizeUser(user);
}

async function updateAvatar(userId, avatarUrl, locale) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError(t('USER_NOT_FOUND', locale), 404, 'USER_NOT_FOUND');
  }

  await user.update({ avatarUrl });
  return sanitizeUser(user);
}

async function getProviderAverageRating(providerId, locale) {
  const provider = await User.findByPk(providerId);

  if (!provider || provider.role !== USER_ROLES.PROVIDER) {
    throw new AppError(t('INVALID_PROVIDER', locale), 400, 'INVALID_PROVIDER');
  }

  const stats = await Review.findOne({
    where: { reviewedId: providerId },
    attributes: [
      [fn('AVG', col('rating')), 'averageRating'],
      [fn('COUNT', col('id')), 'totalReviews'],
    ],
    raw: true,
  });

  return {
    providerId,
    providerName: provider.name,
    averageRating: stats?.averageRating ? Number(Number(stats.averageRating).toFixed(2)) : 0,
    totalReviews: stats?.totalReviews ? Number(stats.totalReviews) : 0,
  };
}

module.exports = {
  registerUser,
  createAdminUser,
  authenticateUser,
  getUserById,
  listUsers,
  updateUserStatus,
  updateUserRole,
  updateProfile,
  updateAvatar,
  getProviderAverageRating,
};
