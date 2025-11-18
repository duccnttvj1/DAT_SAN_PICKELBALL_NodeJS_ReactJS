const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PaymentHistories = sequelize.define(
    "PaymentHistories",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      state: {
        type: DataTypes.ENUM(
          "pending",
          "completed",
          "failed",
          "refunded",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      orderCode: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
    },
    {
      tableName: "PaymentHistories",
      timestamps: true, // tự động quản lý createdAt, updatedAt
    }
  );

  PaymentHistories.associate = (models) => {
    PaymentHistories.belongsTo(models.Users, {
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return PaymentHistories;
};
