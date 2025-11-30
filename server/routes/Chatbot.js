// routes/Chatbot.js – CHATBOT SIÊU THÔNG MINH VỚI OLLAMA
const express = require("express");
const router = express.Router();
const { validateToken } = require("../middlewares/AuthMiddelwares");
const axios = require("axios");

// Ollama chạy local ở port 11434 (mặc định)
const OLLAMA_URL = "http://localhost:11434/api/chat";

// Model bạn muốn dùng (thay đổi tùy ý)
const MODEL = "gemma2:2b"; // hoặc "gemma2:2b", "qwen2.5:7b", "phi3:mini"...

// Lịch sử chat tạm (nếu muốn lưu DB thì thêm sau)
const chatHistories = new Map(); // key: userId → array messages

// POST /chatbot – gửi tin nhắn
router.post("/", validateToken, async (req, res) => {
  const userId = req.user.id;
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Tin nhắn không được để trống" });
  }

  // Lấy lịch sử chat của user (nếu có)
  if (!chatHistories.has(userId)) {
    chatHistories.set(userId, [
      {
        role: "system",
        content: `Bạn là trợ lý đặt sân thể thao ALOBO. Hãy giúp người dùng đặt sân, hỏi giờ trống, giá sân, hướng dẫn thanh toán. 
        Hôm nay là ${new Date().toLocaleDateString("vi-VN")}. 
        Giữ giọng thân thiện, nhiệt tình, dùng tiếng Việt.`,
      },
    ]);
  }

  const history = chatHistories.get(userId);

  // Thêm tin nhắn người dùng
  history.push({ role: "user", content: message.trim() });

  try {
    const response = await axios.post(
      OLLAMA_URL,
      {
        model: MODEL,
        messages: history,
        stream: false, // false để nhận full reply 1 lần
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      },
      { timeout: 60000 } // 60 giây timeout vì Ollama có thể chậm
    );

    const botReply = response.data.message.content.trim();

    // Lưu reply của bot vào lịch sử
    history.push({ role: "assistant", content: botReply });

    // Giới hạn lịch sử ~20 tin nhắn để tránh quá dài
    if (history.length > 40) {
      history.splice(1, 10); // xóa 10 tin nhắn cũ nhất (giữ system prompt)
    }

    res.json({ reply: botReply });
  } catch (err) {
    console.error("Lỗi gọi Ollama:", err.message);
    res.status(500).json({ error: "Bot đang bận, thử lại sau nhé!" });
  }
});

// GET /chatbot/history – lấy lịch sử chat (tùy chọn)
router.get("/history", validateToken, (req, res) => {
  const userId = req.user.id;
  const history = chatHistories.get(userId) || [];
  const userMessages = history
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));
  res.json(userMessages);
});

module.exports = router;
