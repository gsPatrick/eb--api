'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const passwordHash = await bcrypt.hash('Admin@EB2026', 12);

    await queryInterface.bulkInsert('users', [
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'EB Admin',
        email: 'admin@ebservices.local',
        password_hash: passwordHash,
        role: 'admin',
        phone: null,
        locale: 'pt',
        avatar_url: null,
        active: true,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: 'admin@ebservices.local',
    });
  },
};
