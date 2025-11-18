const { DataTypes } = require("sequelize");
const { validateToken } = require("../middlewares/AuthMiddelwares");

module.exports = (sequelize, DataTypes) => {
  const CourtFields = sequelize.define("CourtFields", {
    fieldName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fieldType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pricePerMorning: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    pricePerLunch: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    pricePerAfternoon: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  });
  CourtFields.associate = (models) => {
    CourtFields.belongsTo(models.Courts, {
      foreignKey: "courtId",
      as: "Court",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    CourtFields.hasMany(models.Schedule, {
      // Sửa thành hasMany nếu có nhiều lịch
      foreignKey: "courtFieldId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    // Nếu bạn có BookingDetail
    CourtFields.hasMany(models.BookingDetail, {
      foreignKey: "courtFieldId",
      as: "Bookings",
      onDelete: "CASCADE",
    });
  };

  return CourtFields;
};
