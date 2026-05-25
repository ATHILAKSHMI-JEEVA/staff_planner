const express = require("express");
const { protect } = require("../middleware/auth");
const notificationController = require("../controllers/notificationController");

const router = express.Router();
router.use(protect);

router.get("/my", notificationController.getMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/:id/read", notificationController.markAsRead);

module.exports = router;
