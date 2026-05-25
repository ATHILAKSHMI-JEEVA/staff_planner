// src/models/AuditLog.js
const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    action:       { type: String, required: true },  // "leave_applied", "session_rescheduled"
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    session_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    old_slot_id:  { type: mongoose.Schema.Types.ObjectId, ref: "AvailableSlot" },
    new_slot_id:  { type: mongoose.Schema.Types.ObjectId, ref: "AvailableSlot" },
    meta_json:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditSchema);
