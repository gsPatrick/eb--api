'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('properties', 'entry_instructions', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'gate_code', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'door_code', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('properties', 'lockbox_code', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('properties', 'lockbox_code');
    await queryInterface.removeColumn('properties', 'door_code');
    await queryInterface.removeColumn('properties', 'gate_code');
    await queryInterface.removeColumn('properties', 'entry_instructions');
  },
};
