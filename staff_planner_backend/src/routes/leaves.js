const express = require("express");
const { protect, requireRole, requirePermission } = require("../middleware/auth");
const leaveController = require("../controllers/leaveController");

const router = express.Router();
router.use(protect);

router.get("/my",
  requireRole("teacher"),
  requirePermission("leaves", "read"),
  leaveController.getMyLeaves
);

router.get("/pending",
  requireRole("admin", "manager"),
  requirePermission("leaves", "read"),
  leaveController.getPendingLeaves
);

router.post("/apply",
  requireRole("teacher"),
  requirePermission("leaves", "read_write"),
  leaveController.applyLeave
);

// ✅ NEW: Teacher edits their own pending leave
router.put("/:id",
  requireRole("teacher"),
  requirePermission("leaves", "read_write"),
  leaveController.updateLeave
);

router.patch("/:id/decision",
  requireRole("admin", "manager"),
  requirePermission("leaves", "approve"),
  leaveController.makeDecision
);

module.exports = router;