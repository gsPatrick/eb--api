'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_service_orders_cleaning_type" AS ENUM (
          'deep',
          'regular',
          'post_construction',
          'move_in',
          'move_out',
          'regular_airbnb'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.addColumn('service_orders', 'cleaning_type', {
      type: Sequelize.ENUM(
        'deep',
        'regular',
        'post_construction',
        'move_in',
        'move_out',
        'regular_airbnb'
      ),
      allowNull: false,
      defaultValue: 'regular_airbnb',
    });

    await queryInterface.addColumn('service_orders', 'estimated_duration_minutes', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('service_orders', 'estimated_duration_minutes');
    await queryInterface.removeColumn('service_orders', 'cleaning_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_service_orders_cleaning_type";');
  },
};
