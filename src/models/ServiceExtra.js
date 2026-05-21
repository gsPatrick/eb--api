'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ServiceExtra extends Model {}

  ServiceExtra.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      defaultPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      estimatedTime: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Estimated duration in minutes',
      },
    },
    {
      sequelize,
      modelName: 'ServiceExtra',
      tableName: 'service_extras',
      underscored: true,
      timestamps: true,
    }
  );

  return ServiceExtra;
};
