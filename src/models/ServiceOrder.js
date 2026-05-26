'use strict';

const { Model } = require('sequelize');
const { SERVICE_ORDER_STATUSES, CLEANING_TYPES, PAYMENT_STATUSES } = require('../config/constants');

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
      cleaningType: {
        type: DataTypes.ENUM(...Object.values(CLEANING_TYPES)),
        allowNull: false,
        defaultValue: CLEANING_TYPES.REGULAR_AIRBNB,
      },
      estimatedDurationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      commissionAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      providerPayoutAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      clientPaymentStatus: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_STATUSES)),
        allowNull: false,
        defaultValue: PAYMENT_STATUSES.PENDING,
      },
      providerPaymentStatus: {
        type: DataTypes.ENUM(...Object.values(PAYMENT_STATUSES)),
        allowNull: false,
        defaultValue: PAYMENT_STATUSES.PENDING,
      },
      clientPaidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      providerPaidAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      invoiceNumber: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      invoiceUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      receiptUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      invoiceGeneratedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      receiptGeneratedAt: {
        type: DataTypes.DATE,
        allowNull: true,
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
