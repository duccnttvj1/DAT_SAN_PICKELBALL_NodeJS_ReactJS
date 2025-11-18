const express = require("express");
const router = express.Router();

router.get("/api-key", (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error("GOOGLE_MAPS_API_KEY không được cấu hình trong .env");
    return res.status(500).json({ error: "Server configuration error" });
  }

  res.json({ googleMapsApiKey: apiKey });
});

module.exports = router;
