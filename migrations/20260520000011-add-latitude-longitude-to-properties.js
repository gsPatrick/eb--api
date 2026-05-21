'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('properties', 'latitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });

    await queryInterface.addColumn('properties', 'longitude', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('properties', 'longitude');
    await queryInterface.removeColumn('properties', 'latitude');
  },
};
