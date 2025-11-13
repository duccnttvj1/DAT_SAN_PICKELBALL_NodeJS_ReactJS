const express = require("express");
const cors = require("cors");
const { PayOS } = require("@payos/node");
const { validateToken } = require("./middlewares/AuthMiddelwares");
require("dotenv").config();

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(cors());

const YOUR_DOMAIN = "http://localhost:3000";
app.post("/create-payment-link", validateToken, async (req, res) => {
  try {
    const { totalAmount, description, orderCode, returnUrl, cancelUrl } =
      req.body;

    console.log("=== CREATE PAYMENT LINK DEBUG ===");
    console.log("Body received:", req.body);
    console.log("User ID:", req.user?.id);

    // VALIDATE
    if (!totalAmount || isNaN(totalAmount) || Number(totalAmount) <= 0) {
      return res.status(400).json({ error: "totalAmount phải là số > 0" });
    }

    if (!orderCode || isNaN(orderCode)) {
      return res.status(400).json({ error: "orderCode phải là số nguyên" });
    }

    const order = {
      amount: Number(totalAmount), // PayOS yêu cầu `amount`
      description: description || "Thanh toán sân Pickleball",
      orderCode: Number(orderCode),
      returnUrl: returnUrl || `${YOUR_DOMAIN}/success`,
      cancelUrl: cancelUrl || `${YOUR_DOMAIN}/booking-detail`,
    };

    console.log("PayOS order sent:", order);

    const paymentLink = await payos.paymentRequests.create(order);

    console.log("PayOS success:", paymentLink.checkoutUrl);

    return res.status(200).json({ checkoutUrl: paymentLink.checkoutUrl });
  } catch (err) {
    console.error("=== PAYOS ERROR ===");
    console.error(err.response?.data || err);
    return res.status(500).json({ error: "PayOS error" });
  }
});

const paymentRouter = require("./routes/payment");
app.use("/payment", paymentRouter);

const db = require("./models");

//Router
const usersRouter = require("./routes/Users");
app.use("/users", usersRouter);

const courtsRouter = require("./routes/Courts");
app.use("/courts", courtsRouter);

const courtFieldsRouter = require("./routes/CourtFields");
app.use("/courtFields", courtFieldsRouter);

const favoritesRouter = require("./routes/Favorites");
app.use("/favorites", favoritesRouter);

const scheduleRouter = require("./routes/Schedule");
app.use("/schedule", scheduleRouter);

app.use("/uploads", express.static("uploads"));

db.sequelize.sync({ alter: true }).then(() => {
  app.listen(3001, () => {
    console.log("Server is running on port 3001");
  });
});
