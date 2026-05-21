const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { USER_ROLES } = require('../config/constants');
const config = require('../config');

const SALT_ROUNDS = 12;

async function ensureDefaultAdmin() {
  if (!config.adminBootstrap.enabled) {
    return;
  }

  const { email, password, name, locale } = config.adminBootstrap;
  const normalizedEmail = email.toLowerCase();
  const loginPath = `${config.apiPrefix}/v1/users/login`;

  const existing = await User.findOne({ where: { email: normalizedEmail } });

  if (existing) {
    console.log('[bootstrap] Default admin ready');
    console.log(`[bootstrap] Login: POST ${loginPath}`);
    console.log(`[bootstrap] Email: ${normalizedEmail}`);
    console.log(`[bootstrap] Password: ${password}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: USER_ROLES.ADMIN,
    locale,
    active: true,
  });

  console.log('[bootstrap] Default admin created');
  console.log(`[bootstrap] Login: POST ${loginPath}`);
  console.log(`[bootstrap] Email: ${normalizedEmail}`);
  console.log(`[bootstrap] Password: ${password}`);
}

module.exports = {
  ensureDefaultAdmin,
};
