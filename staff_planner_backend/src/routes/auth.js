const express = require("express");
const { protect } = require("../middleware/auth");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", protect, authController.getMe);

module.exports = router;
