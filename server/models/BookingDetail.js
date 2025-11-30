const { DataTypes } = require("sequelize");
const { validateToken } = require("../middlewares/AuthMiddelwares");

module.exports = (sequelize, DataTypes) => {
  const BookingDetail = sequelize.define("BookingDetail", {
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeRange: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("SUCCESS", "CANCELLED"),
      allowNull: false,
      defaultValue: "SUCCESS",
    },
    orderCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Thời điểm chính thức hủy lịch (rất quan trọng cho báo cáo)",
    },
    cancelledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Users",
        key: "id",
      },
      comment: "ID ADMIN đã hủy lịch (chỉ admin mới hủy được)",
    },
  });
  BookingDetail.associate = (models) => {
    BookingDetail.belongsTo(models.Users, {
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    BookingDetail.belongsTo(models.CourtFields, {
      foreignKey: "courtFieldId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };
  return BookingDetail;
};
