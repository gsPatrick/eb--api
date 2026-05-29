'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('service_orders', 'receipt_number', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'cleaning_reminder_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('service_orders', 'cleaning_reminder_sent_at');
    await queryInterface.removeColumn('service_orders', 'receipt_number');
  },
};
