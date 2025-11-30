// server/utils/discountUtils.js
const { Op } = require("sequelize");
const { Coupons, CourtFields } = require("../models");

/**
 * Tính giảm giá – hỗ trợ cả couponCode (string) và couponId (number)
 * Ưu tiên couponId → an toàn tuyệt đối, không thể fake code
 */
const calculateDiscount = async (
  couponInput, // ← có thể là string (code) hoặc number (id) hoặc null
  originalTotalAmount,
  userId,
  courtFieldId,
  t
) => {
  // Không có mã → trả về không giảm giá
  if (!couponInput) {
    return {
      finalAmount: originalTotalAmount,
      discountAmount: 0,
      coupon: null,
      message: null,
    };
  }

  let coupon = null;

  // Ưu tiên dùng couponId (nếu là số)
  if (!isNaN(couponInput) && Number(couponInput) > 0) {
    const id = Number(couponInput);
    coupon = await Coupons.findByPk(id, {
      where: {
        isActive: true,
        expiryDate: { [Op.gt]: new Date() },
      },
      transaction: t,
      lock: t.LOCK.UPDATE, // chống race condition
    });
  }
  // Nếu không phải số → coi như là couponCode
  else if (typeof couponInput === "string" && couponInput.trim() !== "") {
    coupon = await Coupons.findOne({
      where: {
        code: couponInput.trim().toUpperCase(),
        isActive: true,
        expiryDate: { [Op.gt]: new Date() },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
  }

  // Không tìm thấy coupon hợp lệ
  if (!coupon) {
    return {
      finalAmount: originalTotalAmount,
      discountAmount: 0,
      coupon: null,
      message: "Mã giảm giá không tồn tại hoặc đã hết hạn",
    };
  }

  // Kiểm tra đơn tối thiểu
  if (originalTotalAmount < coupon.minOrderAmount) {
    return {
      finalAmount: originalTotalAmount,
      discountAmount: 0,
      coupon: null,
      message: `Đơn hàng cần tối thiểu ${coupon.minOrderAmount.toLocaleString()}₫`,
    };
  }

  // Kiểm tra lượt dùng toàn cục
  if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
    return {
      finalAmount: originalTotalAmount,
      discountAmount: 0,
      coupon: null,
      message: "Mã giảm giá đã hết lượt sử dụng",
    };
  }

  // Kiểm tra áp dụng đúng sân (nếu coupon có ràng buộc courtId)
  if (coupon.courtId && courtFieldId) {
    const field = await CourtFields.findByPk(courtFieldId, { transaction: t });
    if (!field || field.courtId !== coupon.courtId) {
      return {
        finalAmount: originalTotalAmount,
        discountAmount: 0,
        coupon: null,
        message: "Mã giảm giá không áp dụng cho sân này",
      };
    }
  }

  // Tính tiền giảm
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.round(
      originalTotalAmount * (coupon.discountValue / 100)
    );
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else if (coupon.discountType === "fixed") {
    discountAmount = Math.min(coupon.discountValue, originalTotalAmount);
  }

  // PayOS yêu cầu tối thiểu 1000đ
  let finalAmount = originalTotalAmount - discountAmount;
  if (finalAmount < 1000) {
    discountAmount = originalTotalAmount - 1000;
    finalAmount = 1000;
  }

  return {
    finalAmount,
    discountAmount,
    coupon,
    message: `Áp dụng mã ${
      coupon.code
    } thành công! Giảm ${discountAmount.toLocaleString()}₫`,
  };
};

module.exports = { calculateDiscount };
