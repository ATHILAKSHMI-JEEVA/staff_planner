// src/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:      { type: String, required: true },   // "leave_approved", "reschedule", etc.
    title:     { type: String, required: true },
    message:   { type: String, required: true },
    is_read:   { type: Boolean, default: false },
    meta_json: { type: mongoose.Schema.Types.Mixed },  // any extra data
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
