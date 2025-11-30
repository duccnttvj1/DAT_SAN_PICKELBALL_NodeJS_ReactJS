const express = require("express");
const router = express.Router();

const db = require("../models"); // ← Dòng này fix lỗi db is not defined
const { Op } = require("sequelize");
const { BookingDetail, Users, CourtFields, Schedule, Courts } = db;
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { authorizeRole } = require("../middlewares/AuthorizeRole");

// Middleware: Chỉ chủ hoặc admin
const allowOwnerOrAdmin = async (req, res, next) => {
  const { id } = req.params;
  const authUser = req.user;

  try {
    const booking = await BookingDetail.findByPk(id, {
      include: [{ model: Users, attributes: ["id", "role"] }],
    });

    if (!booking)
      return res.status(404).json({ error: "Booking không tồn tại!" });

    const isOwner = booking.userId === authUser.id;
    const isAdmin = authUser.role === "admin";

    if (isOwner || isAdmin) {
      req.booking = booking;
      next();
    } else {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền thực hiện hành động này!" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// [POST] Tạo booking mới
router.post("/", validateToken, async (req, res) => {
  const { date, timeRange, note, courtFieldId, scheduleId } = req.body;
  const userId = req.user.id;

  // === VALIDATION ===
  if (!date || !timeRange || !courtFieldId) {
    return res.status(400).json({
      error: "Thiếu thông tin bắt buộc: date, timeRange, courtFieldId",
    });
  }

  // Kiểm tra sân nhỏ tồn tại
  const courtField = await CourtFields.findByPk(courtFieldId);
  if (!courtField) {
    return res.status(400).json({ error: "Sân nhỏ không tồn tại!" });
  }

  // Kiểm tra trùng lịch: cùng sân + ngày + giờ
  const existing = await BookingDetail.findOne({
    where: {
      date,
      timeRange,
      courtFieldId,
    },
  });

  if (existing) {
    return res.status(400).json({
      error: "Khung giờ này đã được đặt! Vui chọn khung giờ khác.",
    });
  }

  // (Tùy chọn) Kiểm tra scheduleId có hợp lệ không
  if (scheduleId) {
    const schedule = await Schedule.findOne({
      where: { id: scheduleId, courtFieldId },
    });
    if (!schedule) {
      return res.status(400).json({ error: "Lịch không hợp lệ!" });
    }
  }

  try {
    const newBooking = await BookingDetail.create({
      date,
      timeRange,
      note: note || null,
      status: "SUCCESS", // hoặc "PENDING" nếu cần thanh toán
      userId,
      courtFieldId,
    });

    res.status(201).json({
      message: "Đặt sân thành công!",
      booking: newBooking,
    });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Tạo booking thất bại!" });
  }
});

// [GET] Danh sách booking
router.get("/", validateToken, async (req, res) => {
  const { courtFieldId, date, status, timeRange } = req.query;
  const authUser = req.user;

  try {
    const where = {};

    // User thường chỉ thấy của mình
    if (authUser.role !== "admin") {
      where.userId = authUser.id;
    }

    if (courtFieldId) where.courtFieldId = courtFieldId;
    if (date) where.date = date;
    if (status) where.status = status;
    if (timeRange) {
      where.timeRange = timeRange; // exact match
    }

    const bookings = await BookingDetail.findAll({
      where,
      include: [
        { model: Users, attributes: ["id", "fullName", "phone"] },
        {
          model: CourtFields,
          attributes: ["id", "fieldName", "fieldType"],
          include: [
            {
              model: require("../models").Courts,
              as: "Court",
              attributes: ["courtName"],
            },
          ],
        },
      ],
      order: [
        ["date", "DESC"],
        ["timeRange", "ASC"],
      ],
    });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lấy danh sách thất bại!" });
  }
});

// routes/BookingDetail.js
router.get("/booked-courts", validateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const bookings = await BookingDetail.findAll({
      where: { userId },
      attributes: ["courtFieldId"],
      include: [
        {
          model: CourtFields,
          attributes: ["id", "courtId"],
          include: [
            {
              model: Courts,
              as: "Court",
              attributes: [
                "id",
                "courtName",
                "address",
                "avatarUrl",
                "openTime",
                "closeTime",
                "phoneNumber",
                "rating",
              ],
            },
          ],
        },
      ],
    });

    const uniqueCourts = bookings
      .map((b) => b.CourtField?.Court)
      .filter((court) => court != null)
      .filter(
        (court, index, self) =>
          index === self.findIndex((c) => c.id === court.id)
      );

    console.log("Sân đã đặt:", uniqueCourts); // Log để kiểm tra
    res.json(uniqueCourts);
  } catch (err) {
    console.error("Lỗi /booked-courts:", err);
    res.status(500).json({ error: "Lỗi khi lấy thông tin!" });
  }
});

// [GET] Chi tiết 1 booking
router.get("/:id", validateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await BookingDetail.findByPk(id, {
      include: [
        { model: Users, attributes: ["id", "fullName", "phone"] },
        {
          model: CourtFields,
          attributes: ["id", "fieldName", "fieldType"],
          include: [
            {
              model: Courts,
              as: "Court",
              attributes: ["courtName"],
            },
          ],
        },
      ],
    });

    if (!booking) {
      return res.status(404).json({ error: "Không tìm thấy booking!" });
    }

    if (booking.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Bạn không có quyền xem!" });
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi lấy thông tin!" });
  }
});

// [PATCH] Cập nhật
router.patch("/:id", validateToken, allowOwnerOrAdmin, async (req, res) => {
  const { date, timeRange, note, status } = req.body;

  // Nếu thay đổi ngày/giờ → kiểm tra trùng
  if (date || timeRange) {
    const checkWhere = {
      date: date || req.booking.date,
      timeRange: timeRange || req.booking.timeRange,
      courtFieldId: req.booking.courtFieldId,
    };

    if (req.booking.id) {
      checkWhere.id = { [require("sequelize").Op.ne]: req.booking.id };
    }

    const conflict = await BookingDetail.findOne({ where: checkWhere });
    if (conflict) {
      return res.status(400).json({ error: "Khung giờ đã được đặt!" });
    }
  }

  try {
    await req.booking.update({
      date: date || req.booking.date,
      timeRange: timeRange || req.booking.timeRange,
      note: note !== undefined ? note : req.booking.note,
      status: status || req.booking.status,
    });

    res.json({ message: "Cập nhật thành công!", booking: req.booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cập nhật thất bại!" });
  }
});

// [DELETE] HỦY LỊCH → Chỉ cập nhật status, KHÔNG XÓA + MỞ LẠI SLOT
router.delete("/:id", validateToken, allowOwnerOrAdmin, async (req, res) => {
  const t = await db.sequelize.transaction();

  try {
    const booking = req.booking; // Từ middleware allowOwnerOrAdmin

    // === 1. MỞ LẠI KHUNG GIỜ TRONG BẢNG SCHEDULE ===
    const relatedSchedules = await Schedule.findAll({
      where: {
        courtFieldId: booking.courtFieldId,
        Day: booking.date,
        startTime: {
          [Op.gte]: booking.timeRange.split(" - ")[0],
        },
        state: "booked",
      },
      transaction: t,
    });

    if (relatedSchedules.length > 0) {
      const scheduleIds = relatedSchedules.map((s) => s.id);

      await Schedule.update(
        {
          state: "available",
          lockedBy: null,
          lockedAt: null,
        },
        {
          where: { id: { [Op.in]: scheduleIds } },
          transaction: t,
        }
      );

      // Emit realtime cho khách đang xem sân
      const io = req.app.get("io");
      if (io) {
        relatedSchedules.forEach((slot) => {
          io.to(`courtField_${slot.courtFieldId}`).emit("slot-unlocked", {
            scheduleId: slot.id,
          });
        });
      }
    }

    // === 2. CHỈ CẬP NHẬT BookingDetail → KHÔNG XÓA ===
    await booking.update(
      {
        status: "CANCELLED",
        cancelledAt: new Date(), // Thời gian hủy (rất hữu ích cho báo cáo)
        cancelledBy: req.user.id, // Ai hủy (admin hay chính khách)
        // Nếu bạn muốn thêm lý do hủy sau này:
        // cancelReason: req.body.reason || null,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      message:
        "Hủy lịch thành công! Khung giờ đã được mở lại và trạng thái đã được cập nhật.",
    });
  } catch (err) {
    await t.rollback();
    console.error("Hủy lịch thất bại:", err);
    res.status(500).json({ error: "Hủy lịch thất bại!" });
  }
});

// routes/booking.js (thêm vào cuối file)
router.post("/create-from-payment", validateToken, async (req, res) => {
  const {
    scheduleIds,
    selectedSlots, // [{ date, startTime, endTime, price, scheduleId }]
    fullName,
    phone,
    note,
    courtFieldId,
    totalAmount,
  } = req.body;

  const userId = req.user.id;

  if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
    return res.status(400).json({ error: "Thiếu scheduleIds" });
  }

  if (!selectedSlots || selectedSlots.length === 0) {
    return res.status(400).json({ error: "Thiếu thông tin khung giờ" });
  }

  const t = await db.sequelize.transaction(); // Dùng transaction để đảm bảo atomic

  try {
    // 1. Cập nhật trạng thái Schedule thành 'booked' (chỉ nếu còn 'available')
    const [affected] = await Schedule.update(
      { state: "booked" },
      {
        where: { id: scheduleIds, state: "available" },
        transaction: t,
      }
    );

    if (affected !== scheduleIds.length) {
      await t.rollback();
      return res.status(409).json({
        error: "Một số khung giờ đã được đặt bởi người khác!",
      });
    }

    // 2. Tạo các bản ghi BookingDetail
    const bookingPromises = selectedSlots.map((slot) => {
      return BookingDetail.create(
        {
          date: slot.date,
          timeRange: `${slot.startTime} - ${slot.endTime}`,
          note: note || null,
          status: "SUCCESS",
          userId,
          courtFieldId,
          price: slot.price,
        },
        { transaction: t }
      );
    });

    const bookings = await Promise.all(bookingPromises);

    await t.commit();

    const courtField = await CourtFields.findByPk(courtFieldId);
    const courtId = courtField?.courtId;

    res.json({
      message: "Thanh toán và đặt sân thành công!",
      bookings,
      totalAmount,
    });
  } catch (err) {
    await t.rollback();
    console.error("Create booking from payment error:", err);
    res.status(500).json({ error: "Lỗi hệ thống khi lưu đặt sân" });
  }
});

// PATCH: Admin sửa lịch đặt sân – an toàn, không crash
router.patch(
  "/:id/admin-edit",
  validateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    const { id } = req.params;
    const { date, timeRange, note, status } = req.body;

    if (!date || !timeRange) {
      return res.status(400).json({ error: "Thiếu ngày hoặc khung giờ" });
    }

    const t = await db.sequelize.transaction();

    try {
      const booking = await BookingDetail.findByPk(id, { transaction: t });
      if (!booking) {
        await t.rollback();
        return res.status(404).json({ error: "Không tìm thấy lịch đặt" });
      }

      // Nếu không thay đổi ngày/giờ → chỉ cập nhật note, status
      if (booking.date === date && booking.timeRange === timeRange) {
        await booking.update({ note, status }, { transaction: t });
        await t.commit();
        return res.json({ message: "Cập nhật thành công" });
      }

      // === PHÂN TÍCH KHUNG GIỜ MỚI (bảo vệ lỗi split) ===
      const timeParts = timeRange.split(" - ");
      if (timeParts.length !== 2) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "Khung giờ không đúng định dạng" });
      }
      const [newStart, newEnd] = timeParts;

      // === KIỂM TRA TRÙNG KHUNG GIỜ MỚI ===
      const conflict = await BookingDetail.findOne({
        where: {
          date,
          timeRange,
          courtFieldId: booking.courtFieldId,
          id: { [Op.ne]: booking.id },
          status: "SUCCESS",
        },
        transaction: t,
      });

      if (conflict) {
        await t.rollback();
        return res.status(400).json({
          error: "Khung giờ này đã có người đặt rồi!",
        });
      }

      // === MỞ LẠI SLOT CŨ ===
      const oldStartTime = booking.timeRange.split(" - ")[0].trim();

      await Schedule.update(
        { state: "available", lockedBy: null, lockedAt: null },
        {
          where: {
            courtFieldId: booking.courtFieldId,
            Day: booking.date,
            startTime: oldStartTime,
          },
          transaction: t,
        }
      );

      // === ĐÁNH DẤU SLOT MỚI ===
      const newStartTime = timeRange.split(" - ")[0].trim();

      const newSlot = await Schedule.findOne({
        where: {
          courtFieldId: booking.courtFieldId,
          Day: date,
          startTime: newStartTime,
          state: "available",
        },
        transaction: t,
      });

      if (!newSlot) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "Khung giờ mới không còn trống!" });
      }

      await Schedule.update(
        { state: "booked" },
        { where: { id: newSlot.id }, transaction: t }
      );

      // Cập nhật booking
      await booking.update(
        { date, timeRange, note, status },
        { transaction: t }
      );

      await t.commit();
      res.json({ message: "Sửa lịch thành công!" });
    } catch (err) {
      await t.rollback();
      console.error("Lỗi admin-edit:", err);
      res.status(500).json({ error: "Lỗi server khi sửa lịch" });
    }
  }
);

module.exports = router;
