'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_service_orders_client_payment_status" AS ENUM ('pending', 'paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_service_orders_provider_payment_status" AS ENUM ('pending', 'paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.addColumn('service_orders', 'commission_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('service_orders', 'provider_payout_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('service_orders', 'client_payment_status', {
      type: Sequelize.ENUM('pending', 'paid'),
      allowNull: false,
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('service_orders', 'provider_payment_status', {
      type: Sequelize.ENUM('pending', 'paid'),
      allowNull: false,
      defaultValue: 'pending',
    });
    await queryInterface.addColumn('service_orders', 'client_paid_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'provider_paid_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'invoice_number', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'invoice_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'receipt_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'invoice_generated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('service_orders', 'receipt_generated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE service_orders
      SET
        commission_amount = ROUND(total_price * 0.33, 2),
        provider_payout_amount = ROUND(total_price - ROUND(total_price * 0.33, 2), 2)
      WHERE total_price > 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('service_orders', 'receipt_generated_at');
    await queryInterface.removeColumn('service_orders', 'invoice_generated_at');
    await queryInterface.removeColumn('service_orders', 'receipt_url');
    await queryInterface.removeColumn('service_orders', 'invoice_url');
    await queryInterface.removeColumn('service_orders', 'invoice_number');
    await queryInterface.removeColumn('service_orders', 'provider_paid_at');
    await queryInterface.removeColumn('service_orders', 'client_paid_at');
    await queryInterface.removeColumn('service_orders', 'provider_payment_status');
    await queryInterface.removeColumn('service_orders', 'client_payment_status');
    await queryInterface.removeColumn('service_orders', 'provider_payout_amount');
    await queryInterface.removeColumn('service_orders', 'commission_amount');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_service_orders_provider_payment_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_service_orders_client_payment_status";');
  },
};
