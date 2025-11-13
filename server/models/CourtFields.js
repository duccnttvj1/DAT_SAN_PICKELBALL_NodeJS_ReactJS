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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    CourtFields.hasOne(models.Schedule, {
      foreignKey: "courtFieldId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return CourtFields;
};
