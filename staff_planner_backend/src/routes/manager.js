const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const managerController = require("../controllers/managerController");

const router = express.Router();
router.use(protect);
router.use(requireRole("manager", "admin"));

router.get("/dashboard", managerController.getDashboardStats);
router.get("/reschedules", managerController.getPendingReschedules);
router.patch("/reschedules/:id/decision", managerController.approveReschedule);

module.exports = router;
