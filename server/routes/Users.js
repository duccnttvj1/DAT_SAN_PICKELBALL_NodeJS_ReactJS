const express = require("express");
const { Users } = require("../models");
const multer = require("multer");
const router = express.Router();
const bcrypt = require("bcrypt");
const { validateToken } = require("../middlewares/AuthMiddelwares");
const { authorizeRole } = require("../middlewares/AuthorizeRole");
const { sign } = require("jsonwebtoken");
const upload = multer({ dest: "uploads/" });

router.post("/signup", async (req, res) => {
  const { username, password, email, phone, gender, fullName, avatar_url } =
    req.body;
  const user = await Users.findOne({ where: { username: username } });
  if (user) {
    return res.json({ error: "Username already exists!" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await Users.create({
      username: username,
      password: hash,
      fullName: fullName,
      email: email,
      phone,
      gender,
      avatar_url,
    });
    res.json("SUCCESS");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
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
module.exports = router;
