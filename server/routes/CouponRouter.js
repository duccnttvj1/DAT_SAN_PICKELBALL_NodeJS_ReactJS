const express = require("express");
const router = express.Router();
const { Op, Sequelize } = require("sequelize");
const { Coupons, BookingDetail, User: Users, Courts } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { authorizeRole } = require("../middlewares/AuthorizeRole");

// Chỉ khai báo 1 lần duy nhất
const isAdmin = authorizeRole(["admin"]);

// ------------------------------------------------------------------
// 1. GET: Lấy danh sách coupon đang hoạt động (dành cho user đã login)
router.get("/", validateToken, async (req, res) => {
  try {
    const now = new Date();

    const activeCoupons = await Coupons.findAll({
      where: {
        isActive: true,
        expiryDate: { [Op.gt]: now },
      },
      attributes: [
        "id",
        "code",
        "name",
        "description",
        "discountType",
        "discountValue",
        "maxDiscount",
        "minOrderAmount",
        "expiryDate",
        "maxUsageCount",
        "usageCount",
      ],
      order: [
        ["minOrderAmount", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const result = activeCoupons.map((c) => {
      const remaining = c.maxUsageCount
        ? c.maxUsageCount - c.usageCount
        : Infinity;
      return {
        ...c.toJSON(),
        remainingUsage: remaining > 0 ? remaining : 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching active coupons:", err);
    res.status(500).json({ error: "Không thể lấy danh sách mã giảm giá" });
  }
});

// ------------------------------------------------------------------
// 2. GET: Lấy tất cả coupon (dành cho admin quản lý)
router.get("/admin", validateToken, isAdmin, async (req, res) => {
  try {
    const coupons = await Coupons.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(coupons);
  } catch (err) {
    console.error("Error fetching all coupons (admin):", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// ------------------------------------------------------------------
// 3. POST: Tạo mã giảm giá mới (chỉ admin)
router.post("/", validateToken, isAdmin, async (req, res) => {
  const {
    code,
    name,
    description,
    discountType = "fixed",
    discountValue,
    maxDiscount,
    minOrderAmount = 0,
    expiryDate,
    maxUsageCount,
    courtId,
    isActive = true,
  } = req.body;

  const missing = [];
  if (!code) missing.push("code");
  if (!name) missing.push("name");
  if (!discountValue) missing.push("discountValue");
  if (!courtId) missing.push("courtId");

  if (missing.length > 0) {
    return res.status(400).json({
      error: "Thiếu các trường bắt buộc",
      missingFields: missing,
    });
  }

  if (!["fixed", "percentage"].includes(discountType)) {
    return res
      .status(400)
      .json({ error: "discountType phải là 'fixed' hoặc 'percentage'" });
  }

  if (
    discountType === "percentage" &&
    (discountValue < 1 || discountValue > 100)
  ) {
    return res
      .status(400)
      .json({ error: "discountValue (phần trăm) phải từ 1 đến 100" });
  }

  if (isNaN(courtId) || courtId <= 0) {
    return res.status(400).json({ error: "courtId không hợp lệ" });
  }

  try {
    const court = await Courts.findByPk(courtId);
    if (!court) {
      return res
        .status(400)
        .json({ error: "courtId không tồn tại trong hệ thống" });
    }

    const existed = await Coupons.findOne({
      where: { code: code.trim().toUpperCase() },
    });
    if (existed)
      return res.status(400).json({ error: "Mã giảm giá đã tồn tại" });

    const newCoupon = await Coupons.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || null,
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minOrderAmount: Number(minOrderAmount),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      maxUsageCount: maxUsageCount ? Number(maxUsageCount) : null,
      usageCount: 0,
      isActive,
      courtId: Number(courtId),
    });

    res.status(201).json(newCoupon);
  } catch (err) {
    console.error("Error creating coupon:", err);
    res.status(500).json({
      error: "Không thể tạo mã giảm giá",
      details: err.errors?.map((e) => e.message).join(", ") || err.message,
    });
  }
});

// ------------------------------------------------------------------
// 7. GET: Lấy danh sách coupon hợp lệ cho sân cụ thể (chỉ hiển thị mã còn lượt dùng)
router.get("/by-court/:courtId", validateToken, async (req, res) => {
  const { courtId } = req.params;
  const now = new Date();

  try {
    const coupons = await Coupons.findAll({
      where: {
        courtId: Number(courtId),
        isActive: true,
        expiryDate: { [Op.gt]: now },
        // CHỈ LẤY MÃ CÒN LƯỢT DÙNG HOẶC KHÔNG GIỚI HẠN LƯỢT
        [Op.or]: [
          { maxUsageCount: null }, // Không giới hạn lượt
          { maxUsageCount: { [Op.gt]: 0 } }, // Có giới hạn nhưng > 0
          { usageCount: { [Op.lt]: Sequelize.col("maxUsageCount") } }, // Còn lượt (usageCount < maxUsageCount)
        ],
      },
      attributes: [
        "id",
        "code",
        "name",
        "description",
        "discountType",
        "discountValue",
        "maxDiscount",
        "minOrderAmount",
        "maxUsageCount",
        "usageCount",
      ],
      order: [
        ["minOrderAmount", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const result = coupons.map((c) => {
      const remaining = c.maxUsageCount
        ? c.maxUsageCount - c.usageCount
        : Infinity;

      return {
        ...c.toJSON(),
        remainingUsage: remaining,
        displayText: `${c.code} - ${c.name} ${
          c.discountType === "percentage"
            ? `${c.discountValue}%${
                c.maxDiscount
                  ? ` (tối đa ${c.maxDiscount.toLocaleString()}đ)`
                  : ""
              }`
            : `${c.discountValue.toLocaleString()}đ`
        }${
          c.minOrderAmount > 0
            ? ` (áp dụng đặt sân từ ${c.minOrderAmount.toLocaleString()}đ)`
            : ""
        }`,
      };
    });

    res.json(result);
  } catch (err) {
    console.error("Error fetching coupons by court:", err);
    res.status(500).json({ error: "Lỗi lấy danh sách mã giảm giá" });
  }
});

// ------------------------------------------------------------------
// 4. PUT: Sửa mã giảm giá (chỉ admin)
router.put("/:id", validateToken, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupons.findByPk(req.params.id);
    if (!coupon)
      return res.status(404).json({ error: "Không tìm thấy mã giảm giá" });

    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount,
      expiryDate,
      maxUsageCount,
      courtId,
      isActive,
    } = req.body;

    if (code && code.trim().toUpperCase() !== coupon.code) {
      const existed = await Coupons.findOne({
        where: { code: code.trim().toUpperCase(), id: { [Op.ne]: coupon.id } },
      });
      if (existed)
        return res.status(400).json({ error: "Mã code đã được dùng" });
      coupon.code = code.trim().toUpperCase();
    }

    if (name !== undefined) coupon.name = name;
    if (description !== undefined) coupon.description = description;
    if (discountType !== undefined) {
      if (!["fixed", "percentage"].includes(discountType)) {
        return res.status(400).json({ error: "discountType không hợp lệ" });
      }
      coupon.discountType = discountType;
    }
    if (discountValue !== undefined)
      coupon.discountValue = Number(discountValue);
    if (maxDiscount !== undefined)
      coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (minOrderAmount !== undefined)
      coupon.minOrderAmount = Number(minOrderAmount);
    if (expiryDate !== undefined) coupon.expiryDate = new Date(expiryDate);
    if (maxUsageCount !== undefined)
      coupon.maxUsageCount = maxUsageCount ? Number(maxUsageCount) : null;
    if (courtId !== undefined) coupon.courtId = Number(courtId);
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);

    await coupon.save();
    res.json(coupon);
  } catch (err) {
    console.error("Error updating coupon:", err);
    res.status(500).json({ error: "Không thể cập nhật mã giảm giá" });
  }
});

// ------------------------------------------------------------------
// 5. DELETE: Xóa mã giảm giá (chỉ admin)
router.delete("/:id", validateToken, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupons.findByPk(req.params.id);
    if (!coupon)
      return res.status(404).json({ error: "Không tìm thấy mã giảm giá" });

    await coupon.destroy();
    res.json({ message: "Xóa mã giảm giá thành công" });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res.status(500).json({ error: "Không thể xóa mã giảm giá" });
  }
});

// ------------------------------------------------------------------
// 6. POST: Validate coupon
router.post("/validate", validateToken, async (req, res) => {
  const { code, orderAmount } = req.body;
  if (!code || orderAmount === undefined) {
    return res.status(400).json({ error: "Thiếu code hoặc orderAmount" });
  }

  try {
    const coupon = await Coupons.findOne({
      where: {
        code: code.trim().toUpperCase(),
        isActive: true,
        expiryDate: { [Op.gt]: new Date() },
      },
    });

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        message: "Mã giảm giá không tồn tại hoặc hết hạn",
      });
    }

    if (Number(orderAmount) < coupon.minOrderAmount) {
      return res.status(400).json({
        valid: false,
        message: `Cần đơn tối thiểu ${coupon.minOrderAmount.toLocaleString()}đ`,
      });
    }

    if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
      return res
        .status(400)
        .json({ valid: false, message: "Mã đã hết lượt sử dụng" });
    }

    let discountAmount =
      coupon.discountType === "fixed"
        ? coupon.discountValue
        : Math.min(
            (orderAmount * coupon.discountValue) / 100,
            coupon.maxDiscount || Infinity
          );

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountAmount,
        finalAmount: orderAmount - discountAmount,
      },
    });
  } catch (err) {
    console.error("Validate coupon error:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

module.exports = router;
