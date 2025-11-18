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
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "SUCCESS",
    },
    orderCode: {
      type: DataTypes.STRING,
      allowNull: true,
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
