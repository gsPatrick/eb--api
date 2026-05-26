'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('inbox_messages', 'message_type', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'general',
    });
    await queryInterface.addColumn('inbox_messages', 'attachment_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('inbox_messages', 'attachment_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('inbox_messages', 'attachment_name');
    await queryInterface.removeColumn('inbox_messages', 'attachment_url');
    await queryInterface.removeColumn('inbox_messages', 'message_type');
  },
};
