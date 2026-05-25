// src/models/Branch.js
const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    address:     { type: String, default: "" },
    phone:       { type: String, default: "" },
    is_active:   { type: Boolean, default: true },
    created_by:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Branch", branchSchema);