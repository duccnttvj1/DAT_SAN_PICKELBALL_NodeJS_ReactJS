const express = require("express");
const router = express.Router();
const { Favorites, Courts } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");

router.post("/", validateToken, async (req, res) => {
  const { courtId } = req.body;
  const userId = req.user.id;
  try {
    const existing = await Favorites.findOne({ where: { userId, courtId } });
    if (existing) {
      await existing.destroy();
      return res.json({ isFavorite: false });
    }
    await Favorites.create({ userId, courtId });
    return res.json({ isFavorite: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", validateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const favorites = await Favorites.findAll({
      where: { userId },
      include: [
        {
          model: Courts,
          as: "Court",
          attributes: [
            "id",
            "courtName",
            "address",
            "avatarUrl",
            "openTime",
            "closeTime",
            "phoneNumber",
            "rating",
          ],
        },
      ],
    });
    const courts = favorites.map((f) => f.Court).filter(Boolean);
    res.json(courts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể lấy danh sách yêu thích" });
  }
});

module.exports = router;
