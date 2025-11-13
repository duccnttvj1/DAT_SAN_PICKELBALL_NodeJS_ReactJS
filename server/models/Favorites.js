const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Favorites = sequelize.define(
    "Favorites",
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      courtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["userId", "courtId"],
        },
      ],
    }
  );
  return Favorites;
};
