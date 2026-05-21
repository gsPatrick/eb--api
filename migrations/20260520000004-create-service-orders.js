'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      property_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'properties',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM(
          'pending',
          'in_progress',
          'completed',
          'canceled',
          'billed'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      scheduled_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      checkin_lat: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      checkin_long: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      checkout_lat: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      checkout_long: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true,
      },
      before_photos: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      after_photos: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      extras_total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('service_orders', ['property_id']);
    await queryInterface.addIndex('service_orders', ['provider_id']);
    await queryInterface.addIndex('service_orders', ['status']);
    await queryInterface.addIndex('service_orders', ['scheduled_date']);
    await queryInterface.addConstraint('service_orders', {
      fields: ['property_id', 'scheduled_date'],
      type: 'unique',
      name: 'service_orders_property_id_scheduled_date_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_service_orders_status";');
  },
};
