const { DataTypes } = require("sequelize");
const { validateToken } = require("../middlewares/AuthMiddelwares");

module.exports = (sequelize, DataTypes) => {
  const Courts = sequelize.define("Courts", {
    courtName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    openTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    closeTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    information: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    service: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    lng: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    sportType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    backgroundUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  });

  Courts.associate = (models) => {
    Courts.hasMany(models.CourtFields, {
      foreignKey: "courtId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Courts.hasMany(models.Favorites, {
      foreignKey: "courtId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Courts.hasMany(models.Coupons, {
      foreignKey: "courtId",
      as: "coupons",
    });
  };
  return Courts;
};
