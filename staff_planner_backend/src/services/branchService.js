// src/services/branchService.js
const Branch = require("../models/Branch");
const User   = require("../models/User");

// ── List all branches ─────────────────────────────────────────────────────────
const getAllBranches = async () => {
  const branches = await Branch.find().sort({ createdAt: -1 });

  // For each branch, attach member counts by role
  const result = await Promise.all(
    branches.map(async (b) => {
      const members = await User.find({ branch_id: b._id.toString() }).select("name email phone roles role_id");
      const counts = { client: 0, staff: 0, incharge: 0, sub_incharge: 0, manager: 0 };
      members.forEach((u) => {
        const r = u.roles?.[0];
        if (r === "parent")       counts.client++;
        if (r === "teacher")      counts.staff++;
        if (r === "incharge")     counts.incharge++;
        if (r === "sub_incharge") counts.sub_incharge++;
        if (r === "manager")      counts.manager++;
      });
      return {
        id:         b._id,
        name:       b.name,
        address:    b.address,
        phone:      b.phone,
        is_active:  b.is_active,
        createdAt:  b.createdAt,
        member_counts: counts,
        total_members: members.length,
      };
    })
  );
  return result;
};

// ── Get one branch with its members ──────────────────────────────────────────
const getBranchById = async (branchId) => {
  const branch = await Branch.findById(branchId);
  if (!branch) throw Object.assign(new Error("Branch not found"), { status: 404 });

  const members = await User.find({ branch_id: branchId })
    .select("name email phone roles role_id createdAt")
    .populate("role_id", "name");

  return {
    id:        branch._id,
    name:      branch.name,
    address:   branch.address,
    phone:     branch.phone,
    is_active: branch.is_active,
    createdAt: branch.createdAt,
    members:   members.map((u) => ({
      id:       u._id,
      name:     u.name,
      email:    u.email,
      phone:    u.phone,
      roles:    u.roles,
      role_name: u.role_id?.name ?? u.roles?.[0] ?? "unknown",
      createdAt: u.createdAt,
    })),
  };
};

// ── Create branch ─────────────────────────────────────────────────────────────
const createBranch = async ({ name, address, phone }, adminId) => {
  const exists = await Branch.findOne({ name: name.trim() });
  if (exists) throw Object.assign(new Error("Branch name already exists"), { status: 409 });

  const branch = await Branch.create({ name: name.trim(), address, phone, created_by: adminId });
  return { id: branch._id, name: branch.name, address: branch.address, phone: branch.phone, is_active: branch.is_active };
};

// ── Update branch ─────────────────────────────────────────────────────────────
const updateBranch = async (branchId, { name, address, phone, is_active }) => {
  const branch = await Branch.findByIdAndUpdate(
    branchId,
    { ...(name && { name: name.trim() }), address, phone, ...(is_active !== undefined && { is_active }) },
    { new: true, runValidators: true }
  );
  if (!branch) throw Object.assign(new Error("Branch not found"), { status: 404 });
  return { id: branch._id, name: branch.name, address: branch.address, phone: branch.phone, is_active: branch.is_active };
};

// ── Delete branch (only if no members) ───────────────────────────────────────
const deleteBranch = async (branchId) => {
  const branch = await Branch.findById(branchId);
  if (!branch) throw Object.assign(new Error("Branch not found"), { status: 404 });

  const memberCount = await User.countDocuments({ branch_id: branchId });
  if (memberCount > 0) {
    throw Object.assign(
      new Error(`Cannot delete: branch has ${memberCount} member(s). Remove them first.`),
      { status: 400 }
    );
  }
  await Branch.findByIdAndDelete(branchId);
  return { message: "Branch deleted" };
};

// ── Add member to branch ──────────────────────────────────────────────────────
// memberType: "client" | "staff" | "incharge" | "manager"
const ROLE_MAP = {
  client:      "parent",
  staff:       "teacher",
  incharge:    "incharge",
  sub_incharge: "sub_incharge",
  manager:     "manager",
};

const addMemberToBranch = async (branchId, { name, email, password, phone, memberType }) => {
  const branch = await Branch.findById(branchId);
  if (!branch) throw Object.assign(new Error("Branch not found"), { status: 404 });

  const roleString = ROLE_MAP[memberType];
  if (!roleString) throw Object.assign(new Error("Invalid member type"), { status: 400 });

  // Treat empty string as null so unique sparse index doesn't conflict
  const cleanEmail    = email?.trim()    || null;
  const cleanPassword = password?.trim() || null;

  if (cleanEmail) {
    const exists = await User.findOne({ email: cleanEmail.toLowerCase() });
    if (exists) throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const user = await User.create({
    name,
    email:    cleanEmail    ? cleanEmail.toLowerCase() : null,
    password: cleanPassword || null,
    phone,
    branch_id: branchId.toString(),
    roles: [roleString],
    role_id: null,
  });

  return {
    id:    user._id,
    name:  user.name,
    email: user.email,
    phone: user.phone,
    roles: user.roles,
    branch_id: user.branch_id,
  };
};

// ── Remove member from branch ─────────────────────────────────────────────────
const removeMemberFromBranch = async (branchId, userId) => {
  const user = await User.findOne({ _id: userId, branch_id: branchId.toString() });
  if (!user) throw Object.assign(new Error("Member not found in this branch"), { status: 404 });

  // Just unlink from branch (don't delete the user account)
  user.branch_id = undefined;
  await user.save();
  return { message: "Member removed from branch" };
};

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  addMemberToBranch,
  removeMemberFromBranch,
};