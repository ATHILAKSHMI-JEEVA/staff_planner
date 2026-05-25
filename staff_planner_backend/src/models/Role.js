// src/models/Role.js
// RBAC - Role model storing roles and their permission sets

const mongoose = require("mongoose");

// A single permission entry: resource + action type
const permissionSchema = new mongoose.Schema(
  {
    resource: {
      type: String,
      required: true,
      // e.g. "leaves", "reschedules", "shortfalls", "users", "roles", "audit", "sessions"
    },
    action: {
      type: String,
      required: true,
      enum: ["read", "read_write", "read_write_delete", "approve", "manage"],
    },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // e.g. "admin", "manager", "teacher", "coordinator"
    },
    description: { type: String, default: "" },
    permissions: [permissionSchema], // array of { resource, action }
    is_system: { type: Boolean, default: false }, // system roles can't be deleted
  },
  { timestamps: true }
);

// Helper: check if this role has a given action on a resource
roleSchema.methods.can = function (resource, action) {
  return this.permissions.some(
    (p) => p.resource === resource && p.action === action
  );
};

module.exports = mongoose.model("Role", roleSchema);
