// utils/autoUnlock.js
const { Schedule } = require("../models");
const { Op } = require("sequelize");

let io;

const setIo = (socketIo) => {
  io = socketIo;
};

async function autoUnlockPendingSlots() {
  if (!io) {
    console.warn("Socket.IO chưa được khởi tạo trong autoUnlock");
    return;
  }

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const expired = await Schedule.findAll({
      where: {
        state: "pending",
        lockedAt: { [Op.lt]: fiveMinutesAgo },
      },
    });

    if (expired.length === 0) return;

    const scheduleIds = expired.map((s) => s.id);

    // Unlock trong DB
    await Schedule.update(
      {
        state: "available",
        lockedBy: null,
        lockedAt: null,
      },
      { where: { id: scheduleIds } }
    );

    // QUAN TRỌNG: Emit từng slot riêng biệt (đúng format frontend đang nghe)
    expired.forEach((slot) => {
      io.to(`courtField_${slot.courtFieldId}`).emit("slot-unlocked", {
        scheduleId: slot.id,  // ← Gửi đơn lẻ, không phải mảng
      });
    });

    console.log(
      `Auto-unlocked ${expired.length} slot(s): ${scheduleIds.join(", ")} tại ${new Date().toLocaleTimeString()}`
    );
  } catch (err) {
    console.error("Lỗi auto-unlock:", err);
  }
}

module.exports = { autoUnlockPendingSlots, setIo };