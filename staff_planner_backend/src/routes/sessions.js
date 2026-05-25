const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const sessionController = require("../controllers/sessionController");
const rotationController = require("../controllers/rotationController");

const router = express.Router();
router.use(protect);

router.get("/my",            requireRole("teacher"), sessionController.getMySessions);
router.get("/available",     sessionController.getAvailableSlots);
router.get("/shortfalls",    requireRole("admin"),   sessionController.getShortfalls);
router.get("/substitutes",   requireRole("admin"),   sessionController.getSubstitutes);
router.get("/rotation-check",requireRole("admin"),   rotationController.checkRotation);

// /my-child MUST come before /:id to avoid param conflicts
router.get("/my-child", requireRole("parent"), sessionController.getChildSessions);

router.post("/:id/reschedule", requireRole("parent"), sessionController.rescheduleSession);

// ✅ NEW: Parent confirms or rejects their chosen slot
router.post("/:id/confirm-reschedule", requireRole("parent"), sessionController.confirmReschedule);

router.post("/:id/reassign", requireRole("admin"), sessionController.reassignSession);

module.exports = router;