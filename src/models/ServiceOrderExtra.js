'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceOrderExtra extends Model {}

  ServiceOrderExtra.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      serviceOrderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      serviceExtraId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      priceAtTime: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ServiceOrderExtra',
      tableName: 'service_order_extras',
      underscored: true,
      timestamps: true,
    }
  );

  return ServiceOrderExtra;
};
