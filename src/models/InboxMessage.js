'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InboxMessage extends Model {}

  InboxMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      serviceOrderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      messageType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'general',
      },
      attachmentUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      attachmentName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'InboxMessage',
      tableName: 'inbox_messages',
      underscored: true,
      timestamps: true,
    }
  );

  return InboxMessage;
};
