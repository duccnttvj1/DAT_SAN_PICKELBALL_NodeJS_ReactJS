// models/TempPaymentOrder.js
module.exports = (sequelize, DataTypes) => {
  const TempPaymentOrder = sequelize.define(
    "TempPaymentOrder",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: false,
        // Lưu: selectedSlots, scheduleIds, totalAmount, note, fullName, phone, courtFieldId
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      courtFieldId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },

    {
      timestamps: true,
      tableName: "TempPaymentOrders",
    }
  );

  return TempPaymentOrder;
};
