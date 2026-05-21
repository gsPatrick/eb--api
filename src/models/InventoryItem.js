'use strict';

const { Model } = require('sequelize');
const { INVENTORY_UNITS } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class InventoryItem extends Model {}

  InventoryItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      currentQuantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      criticalLevel: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: DataTypes.ENUM(...Object.values(INVENTORY_UNITS)),
        allowNull: false,
        defaultValue: INVENTORY_UNITS.UNIDADE,
      },
    },
    {
      sequelize,
      modelName: 'InventoryItem',
      tableName: 'inventory_items',
      underscored: true,
      timestamps: true,
    }
  );

  return InventoryItem;
};
