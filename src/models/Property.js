'use strict';

const { Model } = require('sequelize');
const { PROPERTY_STATUSES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class Property extends Model {}

  Property.init(
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
      address: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icalUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },
      clientId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(PROPERTY_STATUSES)),
        allowNull: false,
        defaultValue: PROPERTY_STATUSES.ACTIVE,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      defaultCleaningPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Property',
      tableName: 'properties',
      underscored: true,
      timestamps: true,
    }
  );

  return Property;
};
