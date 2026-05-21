'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContractAcceptance extends Model {}

  ContractAcceptance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      contractId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      acceptedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ContractAcceptance',
      tableName: 'contract_acceptances',
      underscored: true,
      timestamps: true,
    }
  );

  return ContractAcceptance;
};
