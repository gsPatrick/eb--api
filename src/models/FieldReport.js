'use strict';

const { Model } = require('sequelize');
const { FIELD_REPORT_TYPES, FIELD_REPORT_STATUSES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class FieldReport extends Model {}

  FieldReport.init(
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
      providerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(...Object.values(FIELD_REPORT_TYPES)),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      photos: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      status: {
        type: DataTypes.ENUM(...Object.values(FIELD_REPORT_STATUSES)),
        allowNull: false,
        defaultValue: FIELD_REPORT_STATUSES.OPEN,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolvedById: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'FieldReport',
      tableName: 'field_reports',
      underscored: true,
      timestamps: true,
    }
  );

  return FieldReport;
};
