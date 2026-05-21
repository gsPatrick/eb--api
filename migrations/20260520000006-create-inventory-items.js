'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory_items', {
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
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      current_quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      critical_level: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: Sequelize.ENUM('unidade', 'rolo', 'litro'),
        allowNull: false,
        defaultValue: 'unidade',
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

    await queryInterface.addIndex('inventory_items', ['property_id']);
    await queryInterface.addIndex('inventory_items', ['property_id', 'name'], {
      unique: true,
      name: 'inventory_items_property_id_name_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('inventory_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_inventory_items_unit";');
  },
};
