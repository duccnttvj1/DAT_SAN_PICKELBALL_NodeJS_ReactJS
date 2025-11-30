// routes/Schedule.js – HOÀN HẢO CHO LOCK-BULK / UNLOCK-BULK
const express = require("express");
const router = express.Router();
const db = require("../models");
const { Schedule, CourtFields } = db;
const { Op } = require("sequelize");
const { validateToken } = require("../middlewares/AuthMiddelwares");

// GET schedules by courtFieldId + date
router.get("/:courtFieldId/:date", async (req, res) => {
  try {
    const { courtFieldId, date } = req.params;
    const schedules = await Schedule.findAll({
      where: { courtFieldId, Day: date },
      order: [["startTime", "ASC"]],
    });

    const courtField = await CourtFields.findByPk(courtFieldId);
    if (!courtField) return res.json(schedules);

    const getPrice = (hour) => {
      if (hour >= 5 && hour < 12) return Number(courtField.pricePerMorning) || 0;
      if (hour >= 12 && hour < 18) return Number(courtField.pricePerLunch) || 0;
      return Number(courtField.pricePerAfternoon) || 0;
    };

    const result = schedules.map(s => {
      const plain = s.toJSON();
      if (!plain.price || plain.price === 0) {
        const hour = parseInt(plain.startTime.split(":")[0]);
        plain.price = getPrice(hour);
      }
      return plain;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

// BULK LOCK – THAY THẾ HOÀN TOÀN CHO /lock cũ
router.post("/lock-bulk", validateToken, async (req, res) => {
  const { scheduleIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
    return res.status(400).json({ error: "scheduleIds phải là mảng" });
  }

  const t = await db.sequelize.transaction();
  try {
    const [updated] = await Schedule.update(
      {
        state: "pending",
        lockedBy: userId,
        lockedAt: new Date(),
      },
      {
        where: {
          id: { [Op.in]: scheduleIds },
          [Op.or]: [
            { state: "available" },
            { state: "pending", lockedBy: userId } // cho phép lock lại
          ]
        },
        transaction: t,
      }
    );

    const locked = await Schedule.findAll({
      where: { id: { [Op.in]: scheduleIds }, state: "pending", lockedBy: userId },
      transaction: t,
    });

    if (locked.length !== scheduleIds.length) {
      await t.rollback();
      return res.status(409).json({ error: "Một số khung giờ đã bị người khác giữ!" });
    }

    await t.commit();

    // Emit realtime
    const io = req.app.get("io");
    locked.forEach(slot => {
      io.to(`courtField_${slot.courtFieldId}`).emit("slot-locked", {
        scheduleId:slot.id,
        userId
      });
    });

    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    console.error("Lock bulk error:", err);
    res.status(500).json({ error: "Lock thất bại" });
  }
});

// BULK UNLOCK – THAY THẾ HOÀN TOÀN CHO /unlock cũ
router.post("/unlock-bulk", validateToken, async (req, res) => {
  const { scheduleIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
    return res.status(400).json({ error: "scheduleIds phải là mảng" });
  }

  const t = await db.sequelize.transaction();
  try {
    await Schedule.update(
      {
        state: "available",
        lockedBy: null,
        lockedAt: null,
      },
      {
        where: {
          id: { [Op.in]: scheduleIds },
          state: "pending",
          lockedBy: userId,
        },
        transaction: t,
      }
    );

    await t.commit();

    const io = req.app.get("io");
    scheduleIds.forEach(id => {
      // tìm courtFieldId để emit đúng room (có thể cải thiện sau)
      Schedule.findByPk(id).then(slot => {
        if (slot) {
          io.to(`courtField_${slot.courtFieldId}`).emit("slot-unlocked", { scheduleId: id });
        }
      });
    });

    res.json({ success: true });
  } catch (err) {
    await t.rollback();
    console.error("Unlock bulk error:", err);
    res.status(500).json({ error: "Unlock thất bại" });
  }
});

module.exports = router;