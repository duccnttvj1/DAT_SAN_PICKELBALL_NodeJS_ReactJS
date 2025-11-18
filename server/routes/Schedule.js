const express = require("express");
const router = express.Router();
const db = require("../models");
const { Schedule, CourtFields } = db;
const { validateToken } = require("../middlewares/AuthMiddelwares");

// Create new schedule(s)
router.post("/create", validateToken, async (req, res) => {
  try {
    const { schedules } = req.body;

    // Kiểm tra xem thời gian đã được đặt chưa
    for (let schedule of schedules) {
      const existingSchedule = await Schedule.findOne({
        where: {
          courtFieldId: schedule.courtFieldId,
          Day: schedule.Day,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          state: "booked",
        },
      });

      if (existingSchedule) {
        return res.json({
          error: "Khung giờ này đã được đặt. Vui lòng chọn khung giờ khác!",
        });
      }
    }

    // Tạo tất cả các lịch đặt sân
    const createdSchedules = await Schedule.bulkCreate(schedules);

    res.json({
      message: "Đặt sân thành công!",
      schedules: createdSchedules,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// Get schedules by court field ID and date
// Get schedules by court field ID and date
// Returns all schedules for the given field and date (both available and booked)
router.get("/:courtFieldId/:date", async (req, res) => {
  // Fetch schedules for a specific court field and date
  try {
    const { courtFieldId, date } = req.params;
    const schedules = await Schedule.findAll({
      where: {
        courtFieldId: courtFieldId,
        Day: date,
      },
      order: [["startTime", "ASC"]],
    });
    // Fetch court field rates so we can compute price per slot dynamically
    const courtField = await CourtFields.findByPk(courtFieldId);

    // If court field not found, just return schedules (no price attached)
    if (!courtField) {
      return res.json(schedules);
    }

    const computePriceForStart = (startTime) => {
      const hour = parseInt(String(startTime).split(":")[0], 10);

      if (hour >= 5 && hour < 12)
        return Number(courtField.pricePerMorning) || 0;
      if (hour >= 12 && hour < 18) return Number(courtField.pricePerLunch) || 0;
      if (hour >= 18 && hour < 22)
        return Number(courtField.pricePerAfternoon) || 0;

      // Fallback: if outside ranges, pick afternoon as fallback (or 0)
      return Number(courtField.pricePerAfternoon) || 0;
    };

    // Attach computed price to each schedule's plain object representation
    const result = schedules.map((s) => {
      const plain = s.get ? s.get({ plain: true }) : { ...s };
      plain.lockedBy = s.lockedBy;
      const stored = plain.price;
      const storedNum = Number(stored);

      // DÙNG LOGIC CỦA BẠN (ĐÚNG)
      if (
        stored === null ||
        stored === undefined ||
        Number.isNaN(storedNum) ||
        storedNum === 0
      ) {
        plain.price = computePriceForStart(plain.startTime);
      } else {
        plain.price = storedNum;
      }

      return plain;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// Patch single schedule state (e.g. mark available -> booked)
// Expects body: { state: 'booked' }
router.patch("/:id", validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { state } = req.body;

    if (!["available", "booked"].includes(state)) {
      return res.status(400).json({ error: "Invalid state" });
    }

    // For booking: perform atomic update only if current state is 'available'
    if (state === "booked") {
      const [affected] = await Schedule.update(
        { state },
        { where: { id: id, state: "available" } }
      );

      if (affected === 0) {
        return res.status(409).json({
          error: "Khung giờ này đã được đặt. Vui lòng chọn khung giờ khác!",
        });
      }

      const updated = await Schedule.findByPk(id);
      return res.json({ message: "Schedule booked", schedule: updated });
    }

    // For unbooking: allow atomic change only if currently booked
    if (state === "available") {
      const [affected] = await Schedule.update(
        { state },
        { where: { id: id, state: "booked" } }
      );

      if (affected === 0) {
        return res.status(409).json({
          error: "Không thể huỷ: khung giờ chưa được đặt hoặc đã thay đổi.",
        });
      }

      const updated = await Schedule.findByPk(id);
      return res.json({ message: "Schedule released", schedule: updated });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Lỗi server" });
  }
});

// Bulk book slots after payment success
// POST /schedule/booking
// Body: { scheduleIds: [id1, id2, ...] }
// Atomically updates all slots to 'booked' state
router.post("/booking", validateToken, async (req, res) => {
  try {
    const { scheduleIds } = req.body;

    if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return res
        .status(400)
        .json({ error: "scheduleIds must be a non-empty array" });
    }

    // Atomically update all schedules to 'booked' where they are currently 'available'
    const [affected] = await Schedule.update(
      { state: "booked" },
      { where: { id: scheduleIds, state: "available" } }
    );

    if (affected === 0) {
      return res.status(409).json({
        error:
          "Một hoặc nhiều khung giờ đã được đặt bởi người dùng khác. Vui lòng kiểm tra lại.",
      });
    }

    // Fetch updated schedules
    const updated = await Schedule.findAll({
      where: { id: scheduleIds },
    });

    res.json({
      message: "Đã cập nhật trạng thái khung giờ thành công!",
      schedules: updated,
      affected,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// === LOCK SLOT ===
// routes/schedule.js – route POST /lock
router.post("/lock", validateToken, async (req, res) => {
  const { scheduleId } = req.body;
  const userId = req.user.id;

  const t = await db.sequelize.transaction();
  try {
    const slot = await Schedule.findByPk(scheduleId, { transaction: t });

    if (!slot || slot.state !== "available") {
      await t.rollback();
      return res.status(409).json({ error: "Khung giờ không khả dụng" });
    }

    // Lock slot
    slot.state = "pending";
    slot.lockedBy = userId;
    slot.lockedAt = new Date();
    await slot.save({ transaction: t });
    await t.commit();

    // QUAN TRỌNG: Emit realtime cho tất cả người dùng đang xem sân này
    const io = req.app.get("io"); // Lấy io từ app
    io.to(`courtField_${slot.courtFieldId}`).emit("slot-locked", {
      scheduleId: slot.id,
      userId,
    });

    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: "Lock thất bại" });
  }
});

// === UNLOCK SLOT ===
router.post("/unlock", validateToken, async (req, res) => {
  const { scheduleId } = req.body;
  const userId = req.user.id;

  const t = await db.sequelize.transaction();
  try {
    const slot = await Schedule.findByPk(scheduleId, { transaction: t });

    if (!slot || slot.lockedBy !== userId) {
      await t.rollback();
      return res.status(403).json({ error: "Không có quyền" });
    }

    slot.state = "available";
    slot.lockedBy = null;
    slot.lockedAt = null;
    await slot.save({ transaction: t });
    await t.commit();

    // Emit unlock realtime
    const io = req.app.get("io");
    io.to(`courtField_${slot.courtFieldId}`).emit("slot-unlocked", {
      scheduleId: slot.id,
    });

    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: "Unlock thất bại" });
  }
});

module.exports = router;
