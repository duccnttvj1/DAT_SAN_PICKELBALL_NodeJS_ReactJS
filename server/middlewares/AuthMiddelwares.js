const { verify } = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  let accessToken = null;

  // 1. Ưu tiên đọc từ header Authorization: Bearer <token>
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.split(" ")[1];
  }

  // 2. Nếu không có → đọc từ accessToken (giữ tương thích cũ)
  if (!accessToken) {
    accessToken = req.headers["accessToken"] || req.headers["accesstoken"];
  }

  if (!accessToken) {
    return res.json({ error: "User not logged in!" });
  }
  try {
    const validToken = verify(accessToken, process.env.JWT_SECRET);
    req.user = validToken;
    if (validToken) {
      return next();
    }
  } catch (error) {
    return res.json({ error: error });
  }
};

module.exports = { validateToken };
