const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { USER_ROLES } = require('../config/constants');
const config = require('../config');

const SALT_ROUNDS = 12;

async function ensureTestClient() {
  if (!config.testClientBootstrap.enabled) {
    return;
  }

  const { email, password, name, locale } = config.testClientBootstrap;
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const existing = await User.findOne({ where: { email: normalizedEmail } });

  if (existing) {
    await existing.update({
      name,
      locale,
      role: USER_ROLES.CLIENT,
      active: true,
      passwordHash,
    });

    console.log('[bootstrap] Test client synced from env');
    console.log(`[bootstrap] Email: ${normalizedEmail}`);
    return;
  }

  await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: USER_ROLES.CLIENT,
    locale,
    active: true,
  });

  console.log('[bootstrap] Test client created');
  console.log(`[bootstrap] Email: ${normalizedEmail}`);
}

module.exports = {
  ensureTestClient,
};
