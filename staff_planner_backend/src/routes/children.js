const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const childController = require("../controllers/childController");

const router = express.Router();
router.use(protect);

router.get("/my", requireRole("parent"), childController.getMyChildren);

module.exports = router;
