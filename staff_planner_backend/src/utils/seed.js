// src/utils/seed.js — Run once: node src/utils/seed.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const Child = require("../models/Child");
const Session = require("../models/Session");
const AvailableSlot = require("../models/AvailableSlot");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  await Promise.all([
    User.deleteMany({}),
    Role.deleteMany({}),
    Child.deleteMany({}),
    Session.deleteMany({}),
    AvailableSlot.deleteMany({}),
  ]);
  console.log("🗑  Cleared existing data");

  // ── Create system Role documents first ──────────────────────────────────────
  // Admin role has no permissions in DB (isAdmin check bypasses all gates)
  const adminRole = await Role.create({
    name: "admin",
    description: "Full system access",
    is_system: true,
    permissions: [],
  });

  // Manager: can read+approve leaves & reschedules by default
  const managerRole = await Role.create({
    name: "manager",
    description: "Manages leaves and reschedule requests",
    is_system: true,
    permissions: [
      { resource: "leaves", action: "read" },
      { resource: "leaves", action: "approve" },
      { resource: "reschedules", action: "read" },
      { resource: "reschedules", action: "approve" },
    ],
  });

  // Teacher: can read their own sessions & submit leaves
  const teacherRole = await Role.create({
    name: "teacher",
    description: "Views schedule and applies for leave",
    is_system: true,
    permissions: [
      { resource: "sessions", action: "read" },
      { resource: "leaves", action: "read_write" },
    ],
  });

  // Parent: can view sessions and request reschedules
  const parentRole = await Role.create({
    name: "parent",
    description: "Views child sessions and requests reschedules",
    is_system: true,
    permissions: [
      { resource: "sessions", action: "read" },
      { resource: "reschedules", action: "read_write" },
    ],
  });

  console.log("🛡  Created system roles");

  // ── Create users and link their role_id ────────────────────────────────────
  const admin = await User.create({
    name: "Admin User",
    email: "admin1@demo.test",
    password: "Demo1234!",
    roles: ["admin"],
    role_id: adminRole._id,
  });

  const manager = await User.create({
    name: "Manager User",
    email: "manager1@demo.test",
    password: "Demo1234!",
    roles: ["manager"],
    role_id: managerRole._id,
  });

  const teacher1 = await User.create({
    name: "Alice Teacher",
    email: "teacher1@demo.test",
    password: "Demo1234!",
    roles: ["teacher"],
    role_id: teacherRole._id,
    branch_id: "branch-1",
  });

  const teacher2 = await User.create({
    name: "Bob Teacher",
    email: "teacher2@demo.test",
    password: "Demo1234!",
    roles: ["teacher"],
    role_id: teacherRole._id,
    branch_id: "branch-1",
  });

  const parent1 = await User.create({
    name: "Charlie Parent",
    email: "parent1@demo.test",
    password: "Demo1234!",
    roles: ["parent"],
    role_id: parentRole._id,
    phone: "9876543210",
  });

  console.log("👤 Created users (with role_id linked)");

  const child1 = await Child.create({
    name: "Emma",
    parent_user_id: parent1._id,
    branch_id: "branch-1",
    assigned_teacher_id: teacher1._id,
  });

  const child2 = await Child.create({
    name: "Liam",
    parent_user_id: parent1._id,
    branch_id: "branch-1",
    assigned_teacher_id: teacher1._id,
  });

  console.log("👧 Created children");

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  await Session.create([
    {
      teacher_id: teacher1._id,
      child_id: child1._id,
      branch_id: "branch-1",
      date: today,
      start_time: "09:00",
      end_time: "10:00",
      status: "scheduled",
    },
    {
      teacher_id: teacher1._id,
      child_id: child2._id,
      branch_id: "branch-1",
      date: today,
      start_time: "10:00",
      end_time: "11:00",
      status: "scheduled",
    },
  ]);

  console.log("📅 Created sessions");

  await AvailableSlot.create([
    {
      teacher_id: teacher2._id,
      branch_id: "branch-1",
      date: "2026-05-23",
      start_time: "09:00",
      end_time: "10:00",
      max_children: 2,
      spots_taken: 0,
    },
    {
      teacher_id: teacher1._id,
      branch_id: "branch-1",
      date: "2026-05-26",
      start_time: "11:00",
      end_time: "12:00",
      max_children: 2,
      spots_taken: 0,
    },
  ]);

  console.log("🕐 Created available slots");

  console.log("\n🌱 Seed complete! Login credentials (all password: Demo1234!):");
  console.log("   Admin:   admin1@demo.test");
  console.log("   Manager: manager1@demo.test");
  console.log("   Teacher: teacher1@demo.test");
  console.log("   Teacher: teacher2@demo.test");
  console.log("   Parent:  parent1@demo.test");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});