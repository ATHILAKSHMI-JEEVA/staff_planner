// src/models/Session.js
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    child_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    branch_id:  { type: String },
    date:       { type: String, required: true },  // "YYYY-MM-DD"
    start_time: { type: String, required: true },  // "09:00"
    end_time:   { type: String, required: true },  // "10:00"
    // status: scheduled | rescheduled | cancelled
    status:            { type: String, default: "scheduled" },
    // reschedule_status: pending | approved | rejected (null = no pending reschedule)
    reschedule_status: { type: String, default: null },

    // ✅ NEW: pending reschedule slot info (filled when parent picks a slot but not yet confirmed)
    pending_slot_id:    { type: mongoose.Schema.Types.ObjectId, ref: "AvailableSlot", default: null },
    pending_slot_date:  { type: String, default: null },
    pending_slot_start: { type: String, default: null },
    pending_slot_end:   { type: String, default: null },
    pending_teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reschedule_reason:  { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
