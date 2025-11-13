const express = require("express");
const router = express.Router();
const { Favorites } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");

router.post("/", validateToken, async (req, res) => {
  const { courtId } = req.body;
  const userId = req.user.id;
  try {
    const existingFavorite = await Favorites.findOne({
      where: { userId, courtId },
    });
    if (existingFavorite) {
      await Favorites.destroy({ where: { id: existingFavorite.id } });
      return res.json({ message: "Removed from favorites", isFavorite: false });
    }

    const favorites = await Favorites.create({ userId, courtId });
    res.json({ message: "Added to favorites", favorites, isFavorite: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error toggling favorite" });
  }
});

router.get("/:userId", validateToken, async (req, res) => {
  try {
    const favorites = await Favorites.findAll({
      where: { userId: req.params.userId },
    });
    res.json(favorites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching favorites" });
  }
});

router.delete("/:id", validateToken, async (req, res) => {
  try {
    const result = await Favorites.destroy({ where: { id: req.params.id } });
    if (result) {
      res.json({ message: "Favorite deleted successfully" });
    } else {
      res.status(404).json({ error: "Favorite not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting favorite" });
  }
});

module.exports = router;
