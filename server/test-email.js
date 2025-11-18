// test-email.js
require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: `"Hệ thống" <${process.env.EMAIL_USER}>`,
  to: process.env.EMAIL_USER, // Gửi thử về chính mình
  subject: "Test Gửi Email OTP",
  html: "<h3>Đây là email test. Nếu bạn nhận được → CẤU HÌNH THÀNH CÔNG!</h3>",
}).then(() => {
  console.log("Email test đã gửi thành công!");
}).catch((err) => {
  console.error("Lỗi gửi email:", err.message);
});