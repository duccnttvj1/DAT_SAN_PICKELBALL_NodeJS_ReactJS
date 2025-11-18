const express = require("express");
const router = express.Router();
const { PaymentHistories } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");

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

module.exports = router;
