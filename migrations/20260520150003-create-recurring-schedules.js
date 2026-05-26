'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_recurring_schedules_frequency" AS ENUM ('weekly', 'biweekly', 'monthly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('recurring_schedules', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      property_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      cleaning_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'regular_airbnb',
      },
      estimated_duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      frequency: {
        type: Sequelize.ENUM('weekly', 'biweekly', 'monthly'),
        allowNull: false,
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      day_of_month: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      next_run_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('recurring_schedules', ['active', 'next_run_date']);
    await queryInterface.addIndex('recurring_schedules', ['property_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recurring_schedules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_recurring_schedules_frequency";');
  },
};
