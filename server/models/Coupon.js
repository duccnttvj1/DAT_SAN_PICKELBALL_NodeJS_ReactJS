// models/Coupon.js
module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define(
    "Coupons", // tên model
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      discountType: {
        // fixed = giảm tiền mặt, percentage = giảm %
        type: DataTypes.ENUM("fixed", "percentage"),
        allowNull: false,
        defaultValue: "fixed",
      },
      discountValue: {
        // VND nếu fixed, % nếu percentage
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Giá trị giảm: VND hoặc %",
      },
      maxDiscount: {
        // Chỉ dùng khi discountType = percentage
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Giới hạn giảm tối đa (VND)",
      },
      minOrderAmount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Đơn tối thiểu để dùng mã (VND)",
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      maxUsageCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "null = không giới hạn",
      },
      usageCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      // KHÓA NGOẠI QUAN TRỌNG
      courtId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Courts", // tên bảng
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
    },
    {
      tableName: "Coupons",
      timestamps: true,
      indexes: [
        { fields: ["code"] },
        { fields: ["courtId"] },
        { fields: ["isActive"] },
        { fields: ["expiryDate"] },
      ],
    }
  );

  // === ASSOCIATIONS ===
  Coupon.associate = (models) => {
    Coupon.belongsTo(models.Courts, {
      foreignKey: "courtId",
      as: "court",
    });

    // Nếu bạn muốn lấy danh sách booking đã dùng coupon này
    // Coupon.hasMany(models.BookingDetail, { foreignKey: "couponId" });
  };

  return Coupon;
};
