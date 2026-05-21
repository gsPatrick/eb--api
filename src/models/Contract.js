'use strict';

const { Model } = require('sequelize');
const { CONTRACT_TYPES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class Contract extends Model {}

  Contract.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(...Object.values(CONTRACT_TYPES)),
        allowNull: false,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: 'Contract',
      tableName: 'contracts',
      underscored: true,
      timestamps: true,
    }
  );

  return Contract;
};
