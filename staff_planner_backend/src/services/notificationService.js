const Notification = require("../models/Notification");

const getMyNotifications = async (userId) => {
  const notifications = await Notification.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .limit(50);

  return notifications.map((n) => ({
    id: n._id,
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    is_read: n.is_read,
    meta_json: n.meta_json,
    created_at: n.createdAt,
  }));
};

const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({
    user_id: userId,
    is_read: false,
  });
};

const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user_id: userId },
    { is_read: true },
    { new: true }
  );

  if (!notification) {
    throw new Error("Notification not found");
  }

  return notification;
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
};
