'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_service_order_extras_source" AS ENUM ('client_request', 'provider_field');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.addColumn('service_order_extras', 'source', {
      type: Sequelize.ENUM('client_request', 'provider_field'),
      allowNull: false,
      defaultValue: 'provider_field',
    });

    await queryInterface.addColumn('service_order_extras', 'requested_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('service_order_extras', 'requested_at');
    await queryInterface.removeColumn('service_order_extras', 'source');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_service_order_extras_source";');
  },
};
