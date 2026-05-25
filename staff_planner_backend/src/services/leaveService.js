const LeaveRequest = require("../models/LeaveRequest");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const User = require("../models/User");

const getMyLeaves = async (teacherId, teacherName) => {
  const leaves = await LeaveRequest.find({ teacher_id: teacherId }).sort({ createdAt: -1 });
  return leaves.map((l) => ({
    id: l._id,
    teacher_id: l.teacher_id,
    teacher_name: teacherName,
    date: l.date,
    reason: l.reason,
    leave_type: l.leave_type,
    start_time: l.start_time,
    end_time: l.end_time,
    status: l.status,
    shortfall_detected: l.shortfall_detected,
    created_at: l.createdAt,
  }));
};

const getPendingLeaves = async () => {
  const leaves = await LeaveRequest.find({ status: "pending" })
    .populate("teacher_id", "name email")
    .sort({ createdAt: -1 });
  return leaves
    .filter((l) => l.teacher_id != null)
    .map((l) => ({
      id: l._id,
      teacher_id: l.teacher_id._id,
      teacher_name: l.teacher_id.name,
      date: l.date,
      reason: l.reason,
      leave_type: l.leave_type,
      start_time: l.start_time,
      end_time: l.end_time,
      status: l.status,
      shortfall_detected: l.shortfall_detected,
      created_at: l.createdAt,
    }));
};

const applyLeave = async (teacherId, teacherName, data) => {
  const { date, reason, leave_type, start_time, end_time } = data;
  if (!date || !reason) {
    throw new Error("date and reason are required");
  }

  const existing = await LeaveRequest.findOne({ teacher_id: teacherId, date });
  if (existing) {
    throw new Error("You already have a leave request for this date");
  }

  const leaveData = { teacher_id: teacherId, date, reason };
  if (leave_type) leaveData.leave_type = leave_type;
  if (start_time) leaveData.start_time = start_time;
  if (end_time) leaveData.end_time = end_time;

  const nowIST = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const nowISTDate = new Date(nowIST);
  const todayIST = nowISTDate.toLocaleDateString("en-CA");
  const SHIFT_START_HOUR = 9;

  if (date === todayIST) {
    leaveData.is_emergency = true;
    leaveData.penalty_days = nowISTDate.getHours() < SHIFT_START_HOUR ? 1.5 : 2.5;
  }

  const leave = await LeaveRequest.create(leaveData);

  const affectedSessions = await Session.find({
    teacher_id: teacherId,
    date,
    status: "scheduled",
  }).populate({ path: "child_id", populate: { path: "parent_user_id", select: "name phone" } });

  const affected_count = affectedSessions.length;

  const managersAndAdmins = await User.find({ roles: { $in: ["manager", "admin"] } }).select("_id roles");
  const leaveAppliedNotifs = managersAndAdmins.map((u) => ({
    user_id: u._id,
    type: "leave_applied",
    title: "New leave request",
    message: `${teacherName} has applied for leave on ${date}.`,
    meta_json: { leave_id: leave._id, teacher_id: teacherId, date },
  }));
  if (leaveAppliedNotifs.length > 0) {
    await Notification.insertMany(leaveAppliedNotifs);
  }

  if (affected_count > 0) {
    leave.shortfall_detected = true;
    await leave.save();

    for (const session of affectedSessions) {
      const child = session.child_id;
      if (child?.parent_user_id) {
        await Notification.create({
          user_id: child.parent_user_id._id,
          type: "session_affected",
          title: "Teacher Absence — Please Reschedule",
          message: `${teacherName}'s session on ${date} has been cancelled due to teacher absence. Please reschedule.`,
          meta_json: {
            session_id: session._id,
            child_id: child._id,
            date,
            leave_id: leave._id,
          },
        });
      }
    }
  }

  return {
    id: leave._id,
    teacher_id: leave.teacher_id,
    date: leave.date,
    reason: leave.reason,
    leave_type: leave.leave_type,
    start_time: leave.start_time,
    end_time: leave.end_time,
    status: leave.status,
    is_emergency: leave.is_emergency,
    penalty_days: leave.penalty_days,
    shortfall_detected: leave.shortfall_detected,
    affected_count,
    created_at: leave.createdAt,
  };
};

const makeDecision = async (leaveId, decision, decidedByUserId) => {
  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("decision must be 'approved' or 'rejected'");
  }

  const leave = await LeaveRequest.findById(leaveId).populate("teacher_id", "name");
  if (!leave) {
    throw new Error("Leave not found");
  }

  leave.status = decision;
  await leave.save();

  const teacherName = leave.teacher_id?.name || "Teacher";
  const leaveDate = leave.date;
  const notificationsToCreate = [];

  notificationsToCreate.push({
    user_id: leave.teacher_id._id || leave.teacher_id,
    type: `leave_${decision}`,
    title: `Leave ${decision}`,
    message: `Your leave request for ${leaveDate} has been ${decision}.`,
    meta_json: { leave_id: leave._id },
  });

  if (decidedByUserId) {
    const decider = await User.findById(decidedByUserId).select("roles name");
    const deciderName = decider?.name || "A reviewer";
    const deciderRoles = decider?.roles || [];

    if (deciderRoles.includes("manager")) {
      const admins = await User.find({ roles: "admin" }).select("_id");
      for (const admin of admins) {
        notificationsToCreate.push({
          user_id: admin._id,
          type: `leave_${decision}_by_manager`,
          title: `Manager ${decision} a leave`,
          message: `${deciderName} has ${decision} ${teacherName}'s leave request for ${leaveDate}.`,
          meta_json: { leave_id: leave._id, decided_by: decidedByUserId },
        });
      }
    } else if (deciderRoles.includes("admin")) {
      const managers = await User.find({ roles: "manager" }).select("_id");
      for (const manager of managers) {
        notificationsToCreate.push({
          user_id: manager._id,
          type: `leave_${decision}_by_admin`,
          title: `Admin ${decision} a leave`,
          message: `${deciderName} has ${decision} ${teacherName}'s leave request for ${leaveDate}.`,
          meta_json: { leave_id: leave._id, decided_by: decidedByUserId },
        });
      }
    }
  }

  await Notification.insertMany(notificationsToCreate);

  return leave._id;
};

// ✅ NEW: updateLeave — teacher can edit their own PENDING leave
const updateLeave = async (leaveId, teacherId, data) => {
  const { date, reason, leave_type, start_time, end_time } = data;

  const leave = await LeaveRequest.findById(leaveId);
  if (!leave) throw new Error("Leave not found");

  if (leave.teacher_id.toString() !== teacherId.toString()) {
    throw new Error("Forbidden");
  }

  if (leave.status !== "pending") {
    throw new Error("Only pending leave requests can be edited");
  }

  if (!date || !reason) throw new Error("date and reason are required");

  if (date !== leave.date) {
    const conflict = await LeaveRequest.findOne({
      _id: { $ne: leaveId },
      teacher_id: teacherId,
      date,
    });
    if (conflict) throw new Error("You already have a leave request for this date");
  }

  const nowIST = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const nowISTDate = new Date(nowIST);
  const todayIST = nowISTDate.toLocaleDateString("en-CA");

  leave.date = date;
  leave.reason = reason;
  leave.leave_type = leave_type || "Full Day";
  leave.start_time = start_time || undefined;
  leave.end_time = end_time || undefined;

  if (date === todayIST) {
    leave.is_emergency = true;
    leave.penalty_days = nowISTDate.getHours() < 9 ? 1.5 : 2.5;
  } else {
    leave.is_emergency = false;
    leave.penalty_days = 0;
  }

  await leave.save();

  return {
    id: leave._id,
    teacher_id: leave.teacher_id,
    date: leave.date,
    reason: leave.reason,
    leave_type: leave.leave_type,
    start_time: leave.start_time,
    end_time: leave.end_time,
    status: leave.status,
    is_emergency: leave.is_emergency,
    penalty_days: leave.penalty_days,
    shortfall_detected: leave.shortfall_detected,
    created_at: leave.createdAt,
  };
};

module.exports = {
  getMyLeaves,
  getPendingLeaves,
  applyLeave,
  makeDecision,
  updateLeave, // ✅ NEW
};