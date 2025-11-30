// server.js – ĐÃ SỬA HOÀN CHỈNH, CHẠY NGON NGAY!
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

// ROUTES – ĐÚNG TÊN FILE
const googleRoutes = require("./routes/Google");
const couponRouter = require("./routes/CouponRouter");
const paymentRouter = require("./routes/payment");
const paymentHistoryRouter = require("./routes/PaymentHistories");
const usersRouter = require("./routes/Users");
const courtsRouter = require("./routes/Courts");
const courtFieldsRouter = require("./routes/CourtFields");
const favoritesRouter = require("./routes/Favorites");
const scheduleRouter = require("./routes/Schedule");
const bookingDetailRouter = require("./routes/BookingDetail");
const chatbotRouter = require("./routes/Chatbot");

// UTILS
const { setIo, autoUnlockPendingSlots } = require("./utils/autoUnlock");

const app = express();
app.use(express.static("public"));
app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// ======================= ROUTES – HOÀN HẢO =======================
app.use("/google", googleRoutes);
app.use("/coupons", couponRouter);
app.use("/payment", paymentRouter);
app.use("/api/payments", paymentHistoryRouter);
app.use("/users", usersRouter);
app.use("/courts", courtsRouter);
app.use("/courtFields", courtFieldsRouter);
app.use("/favorites", favoritesRouter);
app.use("/schedule", scheduleRouter);
app.use("/booking-details", bookingDetailRouter);
app.use("/uploads", express.static("uploads"));
app.use("/chatbot", chatbotRouter);

// ======================= SOCKET.IO SETUP =======================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

// Truyền io vào app để route có thể dùng req.app.get("io")
app.set("io", io);

// Truyền io vào utils auto unlock
setIo(io);

// Auto unlock pending slots (chạy mỗi 30 giây + chạy ngay lần đầu)
setInterval(autoUnlockPendingSlots, 30_000);
autoUnlockPendingSlots();
console.log("Auto-unlock pending slots đã được khởi động");

// ======================= SOCKET EVENTS =======================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-court-field", (courtFieldId) => {
    socket.join(`courtField_${courtFieldId}`);
    console.log(`User ${socket.id} joined courtField_${courtFieldId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ======================= DATABASE & START =======================
const db = require("./models");

db.sequelize
  .sync({ alter: true })
  .then(() => {
    // PRE-LOAD MODEL ĐỂ KHÔNG BỊ CHẬM LẦN ĐẦU!
    async function preloadOllamaModel() {
      console.log("Đang preload model Ollama (phi3:mini)...");
      try {
        const res = await axios.post("http://localhost:11434/api/chat", {
          model: "phi3:mini",
          messages: [{ role: "user", content: "hi" }],
          stream: false,
        });
        console.log("Preload thành công! Bot sẵn sàng!");
      } catch (err) {
        console.error("Preload thất bại (Ollama chưa chạy?):", err.message);
      }
    }

    // Gọi ngay khi server khởi động
    preloadOllamaModel();
    server.listen(3001, () => {
      console.log("SERVER RUNNING ON http://localhost:3001");
    });
  })
  .catch((err) => {
    console.error("Không kết nối được database:", err);
  });
