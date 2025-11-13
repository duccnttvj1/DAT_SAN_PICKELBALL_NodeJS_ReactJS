// migrations/20251112123456-create-temp-payment-order.js
"use strict";

module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.createTable("TempPaymentOrders", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      orderCode: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });

    // Tạo index tìm nhanh
    await queryInterface.addIndex("TempPaymentOrders", ["orderCode"]);
    await queryInterface.addIndex("TempPaymentOrders", ["expiresAt"]);

    // MySQL Event: tự xóa đơn quá hạn mỗi 30 phút
    await queryInterface.sequelize.query(`
      CREATE EVENT IF NOT EXISTS delete_expired_temp_orders
      ON SCHEDULE EVERY 30 MINUTE
      DO
        DELETE FROM TempPaymentOrders WHERE expiresAt < NOW()
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP EVENT IF EXISTS delete_expired_temp_orders`
    );
    await queryInterface.dropTable("TempPaymentOrders");
  },
};
