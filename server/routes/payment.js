// routes/payment.js
const express = require("express");
const router = express.Router();
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { TempPaymentOrder } = require("../models");
const { Op } = require("sequelize");
const { CourtFields, Schedule, BookingDetail } = require("../models");

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
    await TempPaymentOrder.create({
      orderCode,
      userId,
      courtFieldId,
      data: {
        scheduleIds,
        selectedSlots,
        fullName,
        phone,
        note,
        totalAmount,
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    res.json({ orderCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lưu tạm thất bại" });
  }
});

router.post("/confirm", validateToken, async (req, res) => {
  const { orderCode } = req.body;
  const userId = req.user.id;

  try {
    const tempOrder = await TempPaymentOrder.findOne({
      where: { orderCode, userId },
    });

    if (!tempOrder) {
      return res.status(404).json({ error: "Đơn tạm không tồn tại" });
    }

    let orderData = tempOrder.data || {};

    const { scheduleIds, selectedSlots } = orderData;

    if (!scheduleIds?.length || !selectedSlots?.length) {
      return res.status(400).json({ error: "Dữ liệu đơn hàng không hợp lệ" });
    }

    // TÌM courtId
    const courtField = await CourtFields.findByPk(tempOrder.courtFieldId);
    if (!courtField) {
      return res.status(404).json({ error: "Sân nhỏ không tồn tại" });
    }
    const courtId = courtField.courtId;

    console.log("scheduleIds:", scheduleIds);
    console.log("selectedSlots:", selectedSlots);

    // CẬP NHẬT SCHEDULE
    await Schedule.update(
      { state: "booked" },
      { where: { id: { [Op.in]: scheduleIds } } }
    );

    // TẠO BOOKING DETAIL
    const bookingPromises = selectedSlots.map((slot) =>
      BookingDetail.create({
        date: slot.date,
        timeRange: `${slot.startTime} - ${slot.endTime}`,
        note: orderData.note || null,
        status: "SUCCESS",
        userId,
        courtFieldId: tempOrder.courtFieldId,
        price: slot.price,
      })
    );
    await Promise.all(bookingPromises);

    // XÓA TEMP
    await tempOrder.destroy();

    // TRẢ VỀ
    res.json({
      courtId,
      preselectFieldId: tempOrder.courtFieldId,
      justBookedScheduleIds: scheduleIds,
    });
  } catch (err) {
    console.error("Confirm error:", err);
    res.status(500).json({ error: "Xác nhận thất bại" });
  }
});

module.exports = router;
