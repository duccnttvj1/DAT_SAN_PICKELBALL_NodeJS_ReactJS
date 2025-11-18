require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");

// ROUTES
const googleRoutes = require("./routes/Google");
const paymentRouter = require("./routes/payment");
const paymentHistoryRouter = require("./routes/PaymentHistories");
const usersRouter = require("./routes/Users");
const courtsRouter = require("./routes/Courts");
const courtFieldsRouter = require("./routes/CourtFields");
const favoritesRouter = require("./routes/Favorites");
const scheduleRouter = require("./routes/Schedule");
const bookingDetailRouter = require("./routes/BookingDetail");

// UTILS – CHỈ IMPORT 1 LẦN DUY NHẤT
const { setIo, autoUnlockPendingSlots } = require("./utils/autoUnlock");

// APP INIT
const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(cors());

// ROUTES
app.use("/payment", paymentRouter);
app.use("/google", googleRoutes);
app.use("/api/payments", paymentHistoryRouter);
app.use("/users", usersRouter);
app.use("/courts", courtsRouter);
app.use("/courtFields", courtFieldsRouter);
app.use("/favorites", favoritesRouter);
app.use("/schedule", scheduleRouter);
app.use("/booking-details", bookingDetailRouter);
app.use("/uploads", express.static("uploads"));

// SOCKET.IO SETUP
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

app.set("io", io);

// TRUYỀN IO VÀO UTILS – CHỈ 1 LẦN DUY NHẤT!
setIo(io);

// KHỞI ĐỘNG AUTO UNLOCK – CHỈ 1 LẦN DUY NHẤT!
setInterval(autoUnlockPendingSlots, 30_000);
autoUnlockPendingSlots(); // chạy lần đầu ngay
console.log("Auto-unlock đã được khởi động (mỗi 30 giây)");

// SOCKET EVENTS – CHỈ 1 LẦN DUY NHẤT!
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

// DATABASE & START SERVER
const db = require("./models");
db.sequelize.sync({ alter: true }).then(() => {
  server.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
  });
});
