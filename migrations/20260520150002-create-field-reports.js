'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_field_reports_type" AS ENUM ('damage', 'found', 'lost');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_field_reports_status" AS ENUM ('open', 'resolved');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable('field_reports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      service_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'service_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      property_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('damage', 'found', 'lost'),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      photos: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '[]',
      },
      status: {
        type: Sequelize.ENUM('open', 'resolved'),
        allowNull: false,
        defaultValue: 'open',
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      resolved_by_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('field_reports', ['status']);
    await queryInterface.addIndex('field_reports', ['property_id']);
    await queryInterface.addIndex('field_reports', ['service_order_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('field_reports');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_field_reports_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_field_reports_type";');
  },
};
