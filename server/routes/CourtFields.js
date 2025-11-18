const express = require("express");
const router = express.Router();
const { CourtFields } = require("../models");
const { validateToken } = require("../middlewares/AuthMiddelwares");

router.get("/", async (req, res) => {
  const { Schedule } = require("../models");
  const listOfCourtFields = await CourtFields.findAll({
    include: [Schedule],
  });
  res.json(listOfCourtFields);
});

router.get("/byId/:id", async (req, res) => {
  const id = req.params.id;
  const { Schedule } = require("../models");
  const courtField = await CourtFields.findByPk(id, {
    include: [Schedule],
  });
  res.json(courtField);
});

router.post("/:courtId", async (req, res) => {
  const { courtId } = req.params;
  const {
    fieldName,
    priceMorningTime,
    priceLunchTime,
    priceEveningTime,
    fieldType,
  } = req.body;
  const { Schedule } = require("../models");

  // Validation: Kiểm tra các trường bắt buộc
  if (!fieldName || !fieldType) {
    return res
      .status(400)
      .json({ error: "Field name and field type are required!" });
  }

  // Validation: Kiểm tra 3 giá phải được nhập vào
  if (
    priceMorningTime === undefined ||
    priceLunchTime === undefined ||
    priceEveningTime === undefined
  ) {
    return res.status(400).json({
      error:
        "All three prices (priceMorningTime, priceLunchTime, priceEveningTime) are required!",
    });
  }

  // Validation: Kiểm tra giá phải là số và lớn hơn 0
  if (
    isNaN(priceMorningTime) ||
    isNaN(priceLunchTime) ||
    isNaN(priceEveningTime) ||
    priceMorningTime <= 0 ||
    priceLunchTime <= 0 ||
    priceEveningTime <= 0
  ) {
    return res.status(400).json({
      error: "All prices must be valid numbers greater than 0!",
    });
  }

  const courtField = await CourtFields.findOne({
    where: { fieldName: fieldName, courtId: courtId },
  });
  if (courtField) {
    return res.json({ error: "Court field already exists!" });
  }
  try {
    // Tạo CourtField (không chứa giá, chỉ có thông tin cơ bản)
    const newCourtField = await CourtFields.create({
      fieldName: fieldName,
      courtId: courtId,
      fieldType: fieldType,
    });

    // Tự động tạo Schedule với 3 giá mà người dùng nhập vào
    await Schedule.create({
      courtFieldId: newCourtField.id,
      priceMorningTime: parseFloat(priceMorningTime),
      priceLunchTime: parseFloat(priceLunchTime),
      priceEveningTime: parseFloat(priceEveningTime),
    });

    res.json("ADDED SUCCESSFULLY");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create court field" });
  }
});

module.exports = router;
