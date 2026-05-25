// src/models/Child.js
const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    name:                { type: String, required: true },
    parent_user_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch_id:           { type: String },
    assigned_teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Child", childSchema);
