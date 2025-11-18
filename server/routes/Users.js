const express = require("express");
const { Users } = require("../models");
const multer = require("multer");
const router = express.Router();
const bcrypt = require("bcrypt");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { authorizeRole } = require("../middlewares/AuthorizeRole");
const { sign } = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const upload = multer({ dest: "uploads/" });

console.log("Nodemailer loaded:", !!nodemailer);

router.post("/signup", async (req, res) => {
  const {
    username,
    password,
    fullName,
    email,
    phone,
    gender,
    dateOfBirth,
    role = "user", // Mặc định
  } = req.body;

  const user = await Users.findOne({ where: { username } });
  if (user) {
    return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await Users.create({
      username,
      password: hash,
      fullName,
      email,
      phone,
      gender,
      dateOfBirth,
      role,
    });
    res.json("SUCCESS");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Đăng ký thất bại" });
  }
});

router.get("/auth", validateToken, async (req, res) => {
  const user = await Users.findOne({ where: { id: req.user.id } });
  res.json(user);
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await Users.findOne({ where: { username: username } });

  if (!user) {
    return res.json({ error: "User doesn't exist!" });
  }

  bcrypt.compare(password, user.password).then(async (match) => {
    if (!match) {
      return res.json({ error: "Wrong username and password combination!" });
    }

    const accessToken = sign(
      { username: user.username, id: user.id, role: user.role },
      "importantsecret",
      { expiresIn: "1d" }
    );
    res.json({
      token: accessToken,
      username: user.username,
      id: user.id,
      role: user.role,
    });
  });
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const otpStore = new Map(); // { email: { otp, expires } }

// Quên mật khẩu
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await Users.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: "Email không tồn tại" });

  const otp = crypto.randomInt(100000, 999999).toString();
  otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 phút

  await transporter.sendMail({
    from: '"Hệ thống" <your-email@gmail.com>',
    to: email,
    subject: "Mã OTP Đặt Lại Mật Khẩu",
    html: `<h3>Mã OTP của bạn: <strong>${otp}</strong></h3><p>Hết hạn sau 10 phút.</p>`,
  });

  res.json({ message: "OTP đã được gửi" });
});

// Xác nhận OTP
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: "OTP không hợp lệ hoặc đã hết hạn" });
  }
  res.json({ message: "OTP hợp lệ" });
});

// Đặt lại mật khẩu
router.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  const record = otpStore.get(email);
  if (!record || Date.now() > record.expires) {
    return res.status(400).json({ error: "Phiên đặt lại mật khẩu đã hết hạn" });
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  await Users.update({ password: hash }, { where: { email } });
  otpStore.delete(email);

  res.json({ message: "Đặt lại mật khẩu thành công" });
});

router.put(
  "/changeRole/:userId",
  validateToken,
  authorizeRole("ADMIN"),
  async (req, res) => {
    const { role } = req.body;

    await Users.update({ role }, { where: { id: req.params.userId } });

    res.json("Role updated!");
  }
);

router.get("/all", validateToken, authorizeRole("admin"), async (req, res) => {
  const users = await Users.findAll();
  res.json(users);
});

router.post(
  "/update-avatar",
  validateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const filePath = `http://localhost:3001/uploads/${req.file.filename}`;
      await Users.update(
        { avatar_url: filePath },
        { where: { id: req.user.id } }
      );
      res.json({ message: "Update successful", avatarUrl: filePath });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update avatar" });
    }
  }
);

router.put("/profile", validateToken, async (req, res) => {
  const { phone, fullName, gender, dateOfBirth } = req.body;
  const user = await Users.findByPk(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  await user.update({
    phone: phone,
    fullName: fullName,
    gender: gender,
    dateOfBirth: dateOfBirth,
  });
  res.json({ message: "Profile updated successfully" });
});

// THÊM VÀO FILE ROUTER USER

// Tạo user mới (admin only)
router.post("/", validateToken, authorizeRole("admin"), async (req, res) => {
  const {
    username,
    password,
    fullName,
    email,
    phone,
    role,
    gender,
    dateOfBirth,
  } = req.body;

  const existing = await Users.findOne({ where: { username } });
  if (existing)
    return res.status(400).json({ error: "Username already exists!" });

  try {
    const hash = await bcrypt.hash(
      password || Math.random().toString(36).slice(-8),
      10
    );
    await Users.create({
      username,
      password: hash,
      fullName,
      email,
      phone,
      role: role || "user",
      gender,
      dateOfBirth,
    });
    res.json("USER CREATED");
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Cập nhật user (admin only)
router.put("/:id", validateToken, authorizeRole("admin"), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const user = await Users.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    await user.update(updates);
    res.json("USER UPDATED");
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Xóa user (admin only)
router.delete(
  "/:id",
  validateToken,
  authorizeRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const user = await Users.findByPk(id);
      if (!user) return res.status(404).json({ error: "User not found" });

      await user.destroy();
      res.json("USER DELETED");
    } catch (err) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

module.exports = router;
