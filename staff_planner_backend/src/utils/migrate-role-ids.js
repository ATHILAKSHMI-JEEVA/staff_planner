// src/utils/migrate-role-ids.js
// Run this ONCE on existing databases where users have no role_id:
//   node src/utils/migrate-role-ids.js
//
// It creates system Role documents (if they don't exist) and links
// every user to their matching Role via role_id.

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");

const SYSTEM_ROLES = [
  {
    name: "admin",
    description: "Full system access",
    is_system: true,
    permissions: [],
  },
  {
    name: "manager",
    description: "Manages leaves and reschedule requests",
    is_system: true,
    permissions: [
      { resource: "leaves",      action: "read" },
      { resource: "leaves",      action: "approve" },
      { resource: "reschedules", action: "read" },
      { resource: "reschedules", action: "approve" },
    ],
  },
  {
    name: "teacher",
    description: "Views schedule and applies for leave",
    is_system: true,
    permissions: [
      { resource: "sessions", action: "read" },
      { resource: "leaves",   action: "read_write" },
    ],
  },
  {
    name: "parent",
    description: "Views child sessions and requests reschedules",
    is_system: true,
    permissions: [
      { resource: "sessions",    action: "read" },
      { resource: "reschedules", action: "read_write" },
    ],
  },
];

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Upsert system roles (create if not exists, keep existing permissions)
  const roleMap = {};
  for (const roleDef of SYSTEM_ROLES) {
    let role = await Role.findOne({ name: roleDef.name });
    if (!role) {
      role = await Role.create(roleDef);
      console.log(`🛡  Created system role: ${roleDef.name}`);
    } else {
      // Mark as system if not already
      if (!role.is_system) {
        role.is_system = true;
        await role.save();
      }
      console.log(`✔  Found existing role: ${roleDef.name} (${role.permissions.length} permissions)`);
    }
    roleMap[roleDef.name] = role._id;
  }

  // Link every user who has no role_id
  const users = await User.find({ role_id: null });
  console.log(`\n👤 Found ${users.length} users without role_id`);

  let updated = 0;
  for (const user of users) {
    // Pick the first non-empty role string
    const roleName = user.roles?.[0];
    if (roleName && roleMap[roleName]) {
      user.role_id = roleMap[roleName];
      await user.save();
      console.log(`   Linked ${user.email} → ${roleName}`);
      updated++;
    } else {
      console.log(`   ⚠  Skipped ${user.email} (unknown role: ${user.roles})`);
    }
  }

  console.log(`\n✅ Migration complete. Updated ${updated}/${users.length} users.`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});