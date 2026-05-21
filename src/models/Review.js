'use strict';

const { Model } = require('sequelize');
const { REVIEW_RATING_MIN, REVIEW_RATING_MAX } = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  class Review extends Model {}

  Review.init(
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
      reviewerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reviewedId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: REVIEW_RATING_MIN,
          max: REVIEW_RATING_MAX,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Review',
      tableName: 'reviews',
      underscored: true,
      timestamps: true,
    }
  );

  return Review;
};
