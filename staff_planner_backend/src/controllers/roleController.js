// src/controllers/roleController.js  (UPDATED — replace existing file)

const roleService = require("../services/roleService");

const getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json({ roles });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    res.json({ role });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const createRole = async (req, res) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json({ role });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const role = await roleService.updateRole(req.params.id, req.body);
    res.json({ role });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/v1/roles/:id/permissions — used by usePermissions hook
const getRolePermissions = async (req, res) => {
  try {
    const permissions = await roleService.getRolePermissions(req.params.id);
    res.json({ permissions });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/v1/roles/assign
// Body: { userId: string, roleId: string | null }
// Allows admin to assign (or remove) a RBAC role from any user.
const assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    const user = await roleService.assignRoleToUser(userId, roleId ?? null);
    res.json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  assignRoleToUser,
};
