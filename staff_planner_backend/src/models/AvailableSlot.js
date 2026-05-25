// src/models/AvailableSlot.js
// A slot = a teacher offering an open timeslot that parents can book for rescheduling
const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    teacher_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch_id:    { type: String },
    date:         { type: String, required: true },
    start_time:   { type: String, required: true },
    end_time:     { type: String, required: true },
    max_children: { type: Number, default: 1 },
    spots_taken:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AvailableSlot", slotSchema);
