const express = require("express");
const router = express.Router();
const {
  PaymentHistories,
  TempPaymentOrder,
  Schedule,
  CourtFields,
} = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const db = require("../models");
const { Op } = require("sequelize");

// [GET] ADMIN: Lấy TẤT CẢ giao dịch (dành cho trang quản lý)
router.get("/admin/all", validateToken, async (req, res) => {
  try {
    // Chỉ admin mới được xem tất cả
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Chỉ admin mới xem được" });
    }

    const payments = await PaymentHistories.findAll({
      include: [
        {
          model: db.Users,
          attributes: ["fullName", "phone"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi server" });
  }
});

router.get("/history", validateToken, async (req, res) => {
  try {
    const userId = req.user.id; // từ token

    const payments = await PaymentHistories.findAll({
      where: { userId },
      attributes: [
        "id",
        "totalAmount",
        "state",
        "paymentDate",
        "createdAt",
        "updatedAt",
      ],
      order: [["paymentDate", "DESC"]], // mới nhất trước
    });

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử giao dịch",
      error: error.message,
    });
  }
});

// [GET] Lấy chi tiết 1 giao dịch theo ID (chỉ user sở hữu mới được xem)
router.get("/history/:id", validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await PaymentHistories.findOne({
      where: { id, userId },
      attributes: [
        "id",
        "totalAmount",
        "state",
        "paymentDate",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch hoặc bạn không có quyền xem",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment detail:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết giao dịch",
    });
  }
});

// routes/paymentHistory.js
router.post("/create", validateToken, async (req, res) => {
  try {
    const { totalAmount, state = "cancelled", orderCode } = req.body;
    const userId = req.user.id;

    if (!totalAmount || totalAmount < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Số tiền không hợp lệ" });
    }

    const validStates = [
      "pending",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ];
    if (!validStates.includes(state)) {
      return res
        .status(400)
        .json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const payment = await PaymentHistories.create({
      totalAmount,
      state,
      userId,
      orderCode, // có thể null
      paymentDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Tạo giao dịch thành công",
      data: payment,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ success: false, message: "Mã đơn hàng đã tồn tại" });
    }
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
});

router.delete("/history/:id", validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin"; // giả sử có role trong token

    const payment = await PaymentHistories.findOne({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Giao dịch không tồn tại",
      });
    }

    // Kiểm tra quyền: user sở hữu hoặc admin
    if (payment.userId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa giao dịch này",
      });
    }

    await payment.destroy();

    res.json({
      success: true,
      message: "Xóa giao dịch thành công",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa giao dịch",
    });
  }
});

// [POST] HỦY GIAO DỊCH – ĐÃ FIX LỖI ROLLBACK SAU COMMIT
router.post("/cancel", validateToken, async (req, res) => {
  const { orderCode } = req.body;
  const userId = req.user.id;

  if (!orderCode) {
    return res.status(400).json({ error: "Thiếu orderCode" });
  }

  let t;
  try {
    t = await db.sequelize.transaction();

    // 1. Tìm giao dịch
    const payment = await PaymentHistories.findOne({
      where: { orderCode },
      transaction: t,
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Không tìm thấy giao dịch" });
    }

    // 2. Kiểm tra quyền
    if (payment.userId !== userId && req.user.role !== "admin") {
      await t.rollback();
      return res
        .status(403)
        .json({ error: "Bạn không có quyền hủy giao dịch này" });
    }

    // 3. Mở lại slot nếu có temp order
    const tempOrder = await TempPaymentOrder.findOne({
      where: { orderCode },
      transaction: t,
    });

    if (tempOrder && tempOrder.data?.scheduleIds?.length > 0) {
      await Schedule.update(
        {
          state: "available",
          lockedBy: null,
          lockedAt: null,
        },
        {
          where: { id: { [Op.in]: tempOrder.data.scheduleIds } },
          transaction: t,
        }
      );

      // Emit realtime
      const io = req.app.get("io");
      if (io) {
        tempOrder.data.scheduleIds.forEach((id) => {
          Schedule.findByPk(id).then((slot) => {
            if (slot) {
              io.to(`courtField_${slot.courtFieldId}`).emit("slot-unlocked", {
                scheduleId: id,
              });
            }
          });
        });
      }
    }

    // 4. Cập nhật trạng thái
    await payment.update(
      { state: "cancelled", cancelledAt: new Date() },
      { transaction: t }
    );

    // 5. Xóa temp order
    if (tempOrder) {
      await tempOrder.destroy({ transaction: t });
    }

    // CHỈ COMMIT KHI TẤT CẢ THÀNH CÔNG
    await t.commit();

    // Trả về courtId
    const courtFieldId = tempOrder?.courtFieldId;
    const courtField = courtFieldId
      ? await CourtFields.findByPk(courtFieldId)
      : null;
    const courtId = courtField?.courtId || courtField?.Court?.id;

    res.json({ success: true, courtId });
  } catch (err) {
    // CHỈ ROLLBACK NẾU TRANSACTION CHƯA COMMIT
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error("Hủy giao dịch lỗi:", err);
    res.status(500).json({ error: "Hủy giao dịch thất bại" });
  }
});

module.exports = router;
