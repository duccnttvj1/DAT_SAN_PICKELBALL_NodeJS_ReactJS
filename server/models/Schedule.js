const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Schedule = sequelize.define("Schedule", {
    Day: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    // Price for this time slot (copied from CourtFields pricePer* when seeding or set when creating)
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },

    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  Schedule.associate = (models) => {
    Schedule.belongsTo(models.CourtFields, {
      foreignKey: "courtFieldId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Schedule;
};
