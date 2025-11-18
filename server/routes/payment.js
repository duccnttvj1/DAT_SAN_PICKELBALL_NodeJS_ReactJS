const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const db = require("../models");
const {
  PaymentHistories,
  TempPaymentOrder,
  Schedule,
  BookingDetail,
  CourtFields,
} = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const payos = require("../config/payos");

// TẠO TEMP ORDER
router.post("/temp-order", validateToken, async (req, res) => {
  const {
    scheduleIds,
    selectedSlots,
    fullName,
    phone,
    note,
    courtFieldId,
    totalAmount,
  } = req.body;
  const userId = req.user.id;

  try {
    const orderCode = Date.now();

    await PaymentHistories.create({
      userId,
      orderCode: orderCode.toString(),
      totalAmount,
      state: "pending",
      paymentDate: null,
    });

    await TempPaymentOrder.create({
      orderCode,
      userId,
      courtFieldId,
      data: { scheduleIds, selectedSlots, fullName, phone, note, totalAmount },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    res.json({ orderCode });
  } catch (err) {
    console.error("Temp order error:", err);
    res.status(500).json({ error: "Lưu tạm thất bại" });
  }
});

// CONFIRM ORDER – ĐÃ FIX HOÀN CHỈNH
router.post("/confirm", validateToken, async (req, res) => {
  let orderCode = req.body.orderCode;
  const userId = req.user.id;
  const t = await db.sequelize.transaction();

  try {
    // 1. KIỂM TRA PAYOS ĐÃ PAID CHƯA
    if (!orderCode) {
      await t.rollback();
      return res.status(400).json({ error: "Thiếu orderCode" });
    }

    orderCode = orderCode.toString();

    let payosInfo;
    try {
      payosInfo = await payos.paymentRequests.get(orderCode);
    } catch (payosErr) {
      await t.rollback();
      console.error("[PAYOS INFO ERROR]:", payosErr.response?.data || payosErr);
      return res.status(400).json({ error: "Không thể xác minh thanh toán!" });
    }

    if (payosInfo.status !== "PAID") {
      await t.rollback();
      return res.status(400).json({ error: "Thanh toán chưa hoàn tất!" });
    }

    // 2. LẤY TEMP ORDER + TIẾP TỤC LOGIC CŨ
    const tempOrder = await TempPaymentOrder.findOne({
      where: { orderCode, userId },
      transaction: t,
    });

    if (!tempOrder) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Đơn tạm không tồn tại hoặc đã hết hạn" });
    }

    if (tempOrder.expiresAt < new Date()) {
      await t.rollback();
      return res.status(410).json({ error: "Đơn hàng tạm đã hết hạn!" });
    }

    const { scheduleIds, selectedSlots, note } = tempOrder.data || {};
    if (!scheduleIds?.length || !selectedSlots?.length) {
      await t.rollback();
      return res.status(400).json({ error: "Dữ liệu đơn hàng không hợp lệ" });
    }

    const courtField = await CourtFields.findByPk(tempOrder.courtFieldId, {
      transaction: t,
    });
    if (!courtField) {
      await t.rollback();
      return res.status(404).json({ error: "Sân nhỏ không tồn tại" });
    }

    // Cập nhật trạng thái slot
    const [updatedCount] = await Schedule.update(
      { state: "booked", lockedBy: null, lockedAt: null },
      {
        where: {
          id: { [Op.in]: scheduleIds },
          [Op.or]: [
            { state: "available" },
            { state: "pending", lockedBy: userId },
          ],
        },
        transaction: t,
      }
    );

    if (updatedCount !== scheduleIds.length) {
      await t.rollback();
      return res
        .status(409)
        .json({ error: "Một số khung giờ đã bị người khác đặt!" });
    }

    // Tạo BookingDetail
    await Promise.all(
      selectedSlots.map((slot) =>
        BookingDetail.create(
          {
            date: slot.date,
            timeRange: `${slot.startTime} - ${slot.endTime}`,
            note: note || null,
            status: "SUCCESS",
            userId,
            courtFieldId: tempOrder.courtFieldId,
            price: slot.price,
            orderCode: orderCode.toString(),
          },
          { transaction: t }
        )
      )
    );

    // Cập nhật PaymentHistories
    await PaymentHistories.update(
      { state: "completed", paymentDate: new Date() },
      { where: { orderCode, userId }, transaction: t }
    );

    // Xóa temp order
    await tempOrder.destroy({ transaction: t });
    await t.commit();

    return res.json({
      courtId: courtField.courtId,
      preselectFieldId: tempOrder.courtFieldId,
      justBookedScheduleIds: scheduleIds,
    });
  } catch (err) {
    await t.rollback();
    console.error("Confirm error:", err);
    return res.status(500).json({ error: "Xác nhận thất bại" });
  }
});

// routes/payment.js (thêm logs vào /info và /status)
router.get("/info/:orderCode", async (req, res) => {
  console.log("[PAYMENT INFO] Yêu cầu cho orderCode:", req.params.orderCode); // DEBUG

  try {
    const paymentInfo = await payos.paymentRequests.get(
      Number(req.params.orderCode)
    );
    console.log("[PAYMENT INFO] PayOS trả về:", paymentInfo); // DEBUG

    if (!paymentInfo) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    res.json({
      orderCode: paymentInfo.orderCode,
      amount: paymentInfo.amount,
      description: paymentInfo.description,
      qrCode: paymentInfo.qrCode, // Nếu PayOS trả qrCode
      checkoutUrl: paymentInfo.checkoutUrl,
    });
  } catch (err) {
    console.error("[PAYMENT INFO] Lỗi:", err.response?.data || err); // DEBUG
    res.status(500).json({ error: "Không thể lấy thông tin thanh toán" });
  }
});

router.get("/status/:orderCode", async (req, res) => {
  console.log("[PAYMENT STATUS] Yêu cầu cho orderCode:", req.params.orderCode); // DEBUG

  try {
    const paymentInfo = await payos.paymentRequests.get(
      Number(req.params.orderCode)
    );
    console.log("[PAYMENT STATUS] PayOS trả về status:", paymentInfo.status); // DEBUG

    res.json({
      status: paymentInfo.status,
      orderCode: paymentInfo.orderCode,
    });
  } catch (err) {
    console.error("[PAYMENT STATUS] Lỗi:", err); // DEBUG
    res.json({ status: "PENDING" });
  }
});

// === THÊM VÀO CUỐI file routes/payment.js (trước module.exports) ===

// TẠO PAYMENT LINK PAYOS – ĐÃ FIX 100% LỖI courtId null
// TẠO PAYMENT LINK PAYOS – ĐÚNG CHO V2, ĐÃ FIX 100%
// TẠO PAYMENT LINK PAYOS – ĐÚNG CHO @payos/node V2.2+ (NAMESPACE paymentRequests)
router.post("/create-payment-link", validateToken, async (req, res) => {
  const { orderCode } = req.body;
  const userId = req.user.id;

  try {
    // Debug: Kiểm tra namespace paymentRequests có method create
    console.log("=== PAYOS DEBUG V2 ===");
    console.log(
      "paymentRequests.create có phải function?",
      typeof payos.paymentRequests.create === "function"
    );
    console.log("=====================");

    const tempOrder = await TempPaymentOrder.findOne({
      where: {
        orderCode: orderCode,
        userId: userId,
        expiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!tempOrder) {
      return res
        .status(404)
        .json({ error: "Đơn hàng tạm không tồn tại hoặc đã hết hạn!" });
    }

    const { totalAmount, selectedSlots, fullName, phone, note } =
      tempOrder.data;
    const courtFieldId = tempOrder.courtFieldId;

    const courtField = await CourtFields.findByPk(courtFieldId, {
      include: [{ model: db.Courts, as: "Court" }],
    });

    if (!courtField) {
      return res.status(404).json({ error: "Sân không tồn tại!" });
    }

    const courtId =
      courtField.Court?.courtId || courtField.courtId || "unknown";

    // Cấu trúc data ĐÚNG CHO V2.2+ (orderCode đưa vào data, không truyền riêng)
    const paymentData = {
      orderCode: Number(orderCode), // Phải là number
      amount: totalAmount, // Số tiền (number, VND)
      description: `Đặt sân${fullName ? " - " + fullName.split(" ")[0] : ""}`
        .trim()
        .substring(0, 25),
      items: selectedSlots.map((slot) => ({
        // Mảng items chi tiết (tùy chọn nhưng khuyến khích)
        name: `${courtField.fieldName || "Sân nhỏ"} - ${slot.date} ${
          slot.timeRange || `${slot.startTime} - ${slot.endTime}`
        }`,
        quantity: 1,
        price: slot.price,
      })),
      returnUrl: `http://localhost:3000/success?orderCode=${orderCode}`,
      cancelUrl: `http://localhost:3000/booking-detail/${courtId}`,
      buyerName: fullName || undefined,
      buyerPhone: phone || undefined,
    };

    // ĐÚNG: DÙNG NAMESPACE paymentRequests.create(data) – method mới của v2.2+
    const paymentLinkRes = await payos.paymentRequests.create(paymentData);

    // Log thành công (bỏ sau khi test OK)
    console.log("[PAYOS CREATE LINK SUCCESS]:", {
      checkoutUrl: paymentLinkRes.checkoutUrl,
      qrCode: !!paymentLinkRes.qrCode,
      orderCode: paymentLinkRes.orderCode,
    });

    res.json({
      success: true,
      checkoutUrl: paymentLinkRes.checkoutUrl,
      qrCode: paymentLinkRes.qrCode || null, // Base64 QR nếu có
    });
  } catch (err) {
    console.error("[PAYOS CREATE LINK ERROR]:", {
      message: err.message,
      response: err.response?.data || "No response data",
      status: err.response?.status,
    });
    res.status(500).json({
      error:
        "Tạo link thanh toán thất bại: " +
        (err.message || "Lỗi không xác định"),
    });
  }
});

module.exports = router;
