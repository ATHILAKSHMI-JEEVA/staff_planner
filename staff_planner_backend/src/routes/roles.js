// src/routes/roles.js  (UPDATED — replace existing file)
// ─────────────────────────────────────────────────────────────────────────────
// Adds: POST /api/v1/roles/assign — Admin assigns a role to a user
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const roleController = require("../controllers/roleController");

const router = express.Router();

// GET /api/v1/roles — any authenticated user can see roles (for usePermissions)
router.get("/", protect, roleController.getAllRoles);

// GET /api/v1/roles/:id — any authenticated user
router.get("/:id", protect, roleController.getRoleById);

// GET /api/v1/roles/:id/permissions — used by usePermissions hook
router.get("/:id/permissions", protect, roleController.getRolePermissions);

// POST /api/v1/roles — admin only
router.post("/", protect, requireRole("admin"), roleController.createRole);

// PUT /api/v1/roles/:id — admin only
router.put("/:id", protect, requireRole("admin"), roleController.updateRole);

// DELETE /api/v1/roles/:id — admin only
router.delete("/:id", protect, requireRole("admin"), roleController.deleteRole);

// POST /api/v1/roles/assign — admin assigns a Role to a User
// Body: { userId: string, roleId: string | null }
// Setting roleId to null removes the RBAC role from the user.
router.post("/assign", protect, requireRole("admin"), roleController.assignRoleToUser);

module.exports = router;
