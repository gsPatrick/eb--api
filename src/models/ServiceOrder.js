'use strict';

const { Model } = require('sequelize');
const { SERVICE_ORDER_STATUSES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class ServiceOrder extends Model {}

  ServiceOrder.init(
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
      providerId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(SERVICE_ORDER_STATUSES)),
        allowNull: false,
        defaultValue: SERVICE_ORDER_STATUSES.PENDING,
      },
      scheduledDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      checkinLat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      checkinLong: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      checkoutLat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      checkoutLong: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      beforePhotos: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      afterPhotos: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      extrasTotalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'ServiceOrder',
      tableName: 'service_orders',
      underscored: true,
      timestamps: true,
    }
  );

  return ServiceOrder;
};
