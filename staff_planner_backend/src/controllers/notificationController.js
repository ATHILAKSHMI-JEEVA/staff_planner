const notificationService = require("../services/notificationService");

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await notificationService.getMyNotifications(req.user._id);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user._id);
    res.json({ message: "Marked as read" });
  } catch (err) {
    if (err.message === "Notification not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
};
