const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    teacher_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date:              { type: String, required: true },  // "YYYY-MM-DD"
    reason:            { type: String, required: true },
    leave_type:        { 
      type: String, 
      enum: ["Full Day", "Half Day (Morning)", "Half Day (Afternoon)", "Custom Hours"],
      default: "Full Day" 
    },
    start_time:        { type: String }, // e.g., "09:00"
    end_time:          { type: String }, // e.g., "11:00"
    // status: pending | approved | rejected
    status:            { type: String, default: "pending" },
    is_emergency:      { type: Boolean, default: false },
    penalty_days:      { type: Number, default: 0 },
    shortfall_detected:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveRequest", leaveSchema);
