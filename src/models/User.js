'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { USER_ROLES, SUPPORTED_LOCALES } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    async validatePassword(plainPassword) {
      return bcrypt.compare(plainPassword, this.passwordHash);
    }

    toSafeJSON() {
      const values = { ...this.get() };
      delete values.passwordHash;
      return values;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...Object.values(USER_ROLES)),
        allowNull: false,
        defaultValue: USER_ROLES.CLIENT,
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      locale: {
        type: DataTypes.ENUM(...SUPPORTED_LOCALES),
        allowNull: false,
        defaultValue: 'pt',
      },
      avatarUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
    }
  );

  return User;
};
