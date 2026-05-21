'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      service_order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'service_orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reviewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reviewed_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('reviews', ['service_order_id']);
    await queryInterface.addIndex('reviews', ['reviewer_id']);
    await queryInterface.addIndex('reviews', ['reviewed_id']);
    await queryInterface.addConstraint('reviews', {
      fields: ['service_order_id', 'reviewer_id'],
      type: 'unique',
      name: 'reviews_service_order_reviewer_unique',
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE reviews
      ADD CONSTRAINT reviews_rating_range
      CHECK (rating >= 1 AND rating <= 5)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reviews');
  },
};
