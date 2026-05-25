const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

const router = express.Router();
router.use(protect, requireRole("admin"));

router.get("/audit", adminController.getAuditLogs);

module.exports = router;
