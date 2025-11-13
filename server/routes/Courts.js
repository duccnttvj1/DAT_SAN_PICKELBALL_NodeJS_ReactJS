const express = require("express");
const router = express.Router();
const { Courts } = require("../models");
const { Favorites } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { CourtFields } = require("../models");

router.get("/", validateToken, async (req, res) => {
  const listOfCourts = await Courts.findAll({ include: [Favorites] });

  const favoritedCourts = await Favorites.findAll({
    where: { userId: req.user.id },
  });
  res.json({ listOfCourts: listOfCourts, favoritedCourts: favoritedCourts });
});

router.get("/byId/:id", async (req, res) => {
  const id = req.params.id;
  const { Schedule } = require("../models");
  const court = await Courts.findByPk(id, { 
    include: [{
      model: CourtFields,
      include: [Schedule]
    }]
  });
  res.json(court);
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
    });
    res.json("COURT ADDED");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create court" });
  }
});

module.exports = router;
