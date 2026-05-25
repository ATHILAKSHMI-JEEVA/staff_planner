// src/services/roleService.js  (UPDATED — replace existing file)

const Role = require("../models/Role");
const User = require("../models/User");

const getAllRoles = async () => {
  return Role.find().sort({ is_system: -1, name: 1 }).lean();
};

const getRoleById = async (id) => {
  const role = await Role.findById(id).lean();
  if (!role) throw Object.assign(new Error("Role not found"), { status: 404 });
  return role;
};

const createRole = async ({ name, description, permissions = [] }) => {
  const trimmed = name.trim();
  const exists = await Role.findOne({ name: trimmed });
  if (exists) throw Object.assign(new Error("Role name already exists"), { status: 409 });

  const role = await Role.create({ name: trimmed, description, permissions });

  await User.updateMany(
    { roles: trimmed, role_id: null },
    { $set: { role_id: role._id } }
  );

  return role.toObject();
};

const updateRole = async (id, { name, description, permissions }) => {
  const role = await Role.findById(id);
  if (!role) throw Object.assign(new Error("Role not found"), { status: 404 });

  const oldName = role.name;

  if (name !== undefined) role.name = name.trim();
  if (description !== undefined) role.description = description;
  if (permissions !== undefined) role.permissions = permissions;

  await role.save();

  if (name && name.trim() !== oldName) {
    await User.updateMany(
      { roles: oldName },
      { $set: { role_id: role._id } }
    );
  }

  await User.updateMany(
    { roles: role.name, role_id: null },
    { $set: { role_id: role._id } }
  );

  return role.toObject();
};

const deleteRole = async (id) => {
  const role = await Role.findById(id);
  if (!role) throw Object.assign(new Error("Role not found"), { status: 404 });

  await User.updateMany(
    { role_id: role._id },
    { $set: { role_id: null } }
  );

  await role.deleteOne();
  return { deleted: true };
};

const getRolePermissions = async (id) => {
  const role = await Role.findById(id).lean();
  if (!role) return [];
  return role.permissions;
};

/**
 * Assign a RBAC role to a user.
 *
 * @param {string} userId  - The user's _id
 * @param {string|null} roleId - The Role's _id, or null to clear the role
 * @returns {object} The updated user (without password)
 */
const assignRoleToUser = async (userId, roleId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  if (roleId) {
    const role = await Role.findById(roleId);
    if (!role) throw Object.assign(new Error("Role not found"), { status: 404 });
    user.role_id = role._id;
  } else {
    user.role_id = null;
  }

  await user.save();
  return user.toObject();
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