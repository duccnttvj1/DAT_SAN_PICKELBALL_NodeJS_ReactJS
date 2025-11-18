// config/payos.js
const { PayOS } = require("@payos/node");

let payos;

try {
  payos = new PayOS(
    process.env.PAYOS_CLIENT_ID,
    process.env.PAYOS_API_KEY,
    process.env.PAYOS_CHECKSUM_KEY
  );
  console.log("[PayOS] Khởi tạo thành công!");
} catch (error) {
  console.error("[PayOS] Lỗi khởi tạo:", error.message);
  process.exit(1); // Dừng server nếu config sai
}

module.exports = payos;