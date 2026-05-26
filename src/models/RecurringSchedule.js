'use strict';

const { Model } = require('sequelize');
const { CLEANING_TYPES, RECURRENCE_FREQUENCIES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class RecurringSchedule extends Model {}

  RecurringSchedule.init(
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
      cleaningType: {
        type: DataTypes.ENUM(...Object.values(CLEANING_TYPES)),
        allowNull: false,
        defaultValue: CLEANING_TYPES.REGULAR_AIRBNB,
      },
      estimatedDurationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      frequency: {
        type: DataTypes.ENUM(...Object.values(RECURRENCE_FREQUENCIES)),
        allowNull: false,
      },
      dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dayOfMonth: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      nextRunDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'RecurringSchedule',
      tableName: 'recurring_schedules',
      underscored: true,
      timestamps: true,
    }
  );

  return RecurringSchedule;
};
