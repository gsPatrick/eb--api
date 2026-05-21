'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_order_extras', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      service_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'service_orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      service_extra_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'service_extras',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      price_at_time: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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

    await queryInterface.addIndex('service_order_extras', ['service_order_id']);
    await queryInterface.addIndex('service_order_extras', ['service_extra_id']);
    await queryInterface.addConstraint('service_order_extras', {
      fields: ['service_order_id', 'service_extra_id'],
      type: 'unique',
      name: 'service_order_extras_order_extra_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('service_order_extras');
  },
};
