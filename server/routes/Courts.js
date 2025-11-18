const express = require("express");
const router = express.Router();
const { Courts, Favorites, CourtFields, sequelize } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { authorizeRole } = require("../middlewares/AuthorizeRole");
const { Op } = require("sequelize");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// POST: Upload avatar sân (chỉ admin hoặc chủ sân)
router.post(
  "/:id/avatar",
  validateToken,
  authorizeRole("admin"), // hoặc kiểm tra chủ sân
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file" });

      const avatarUrl = `http://localhost:3001/uploads/${req.file.filename}`;
      await Courts.update({ avatarUrl }, { where: { id: req.params.id } });

      res.json({ avatarUrl });
    } catch (err) {
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

router.get("/", validateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.id;

    const where = {};
    if (q && q.trim()) {
      where.courtName = { [Op.like]: `%${q.trim()}%` };
    }

    const listOfCourts = await Courts.findAll({
      where,
      include: [Favorites],
    });

    const favoritedCourts = await Favorites.findAll({
      where: { userId },
    });

    res.json({ listOfCourts, favoritedCourts });
  } catch (error) {
    console.error("Lỗi tìm kiếm:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/byId/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const court = await Courts.findByPk(id, {
      // routes/Courts.js
      include: [
        {
          model: CourtFields,
          include: [
            {
              model: require("../models").Schedule,
            },
          ],
        },
      ],
    });

    if (!court) return res.status(404).json({ error: "Sân không tồn tại" });
    res.json(court);
  } catch (err) {
    console.error("Lỗi lấy chi tiết sân:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const {
    courtName,
    avatarUrl,
    address,
    phoneNumber,
    openTime,
    closeTime,
    image,
  } = req.body;
  const court = await Courts.findOne({ where: { courtName: courtName } });
  if (court) {
    return res.json({ error: "Court already exists!" });
  }
  try {
    await Courts.create({
      courtName: courtName,
      avatarUrl: avatarUrl,
      address: address,
      phoneNumber: phoneNumber,
      openTime: openTime,
      closeTime: closeTime,
      image,
      lat: 10.762622,
      lng: 106.660172,
    });
    res.json("COURT ADDED");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create court" });
  }
});

// Thêm vào file router courts
router.put("/:id", validateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const court = await Courts.findByPk(id);
    if (!court) return res.status(404).json({ error: "Court not found" });

    await court.update(req.body);
    res.json("COURT UPDATED");
  } catch (err) {
    res.status(500).json({ error: "Failed to update court" });
  }
});

router.delete("/:id", validateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const court = await Courts.findByPk(id);
    if (!court) return res.status(404).json({ error: "Court not found" });

    await court.destroy();
    res.json("COURT DELETED");
  } catch (err) {
    res.status(500).json({ error: "Failed to delete court" });
  }
});

router.get("/nearby", async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "Missing lat/lng" });
  }

  try {
    const courts = await Courts.findAll({
      attributes: ["id", "courtName", "address", "lat", "lng", "sportType"],
      where: sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) * cos(radians(lat)) *
          cos(radians(lng) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(lat))
        ) <= ${radius}
      `),
      order: sequelize.literal(`
        6371 * acos(
          cos(radians(${lat})) * cos(radians(lat)) *
          cos(radians(lng) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(lat))
        )
      `),
    });

    res.json({ listOfCourts: courts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// routes/Courts.js
router.get("/all", async (req, res) => {
  try {
    const courts = await Courts.findAll({
      attributes: [
        "id",
        "courtName",
        "address",
        "lat",
        "lng",
        "sportType",
        "avatarUrl",
      ],
    });
    res.json(courts); // ← Trả mảng
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy danh sách sân" });
  }
});

module.exports = router;
