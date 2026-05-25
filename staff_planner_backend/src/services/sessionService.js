const Session = require("../models/Session");
const AvailableSlot = require("../models/AvailableSlot");
const LeaveRequest = require("../models/LeaveRequest");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { getConsecutiveStreak, checkAndSuggestRotation } = require("./rotationService");

const getMySessions = async (teacherId, teacherName, date) => {
  if (!date) throw new Error("date query param required");

  const sessions = await Session.find({ teacher_id: teacherId, date })
    .populate("child_id", "name")
    .sort({ start_time: 1 });

  return sessions.map((s) => ({
    id: s._id,
    teacher_id: s.teacher_id,
    teacher_name: teacherName,
    child_id: s.child_id._id,
    child_name: s.child_id.name,
    branch_id: s.branch_id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
  }));
};

const getAvailableSlots = async (date) => {
  if (!date) throw new Error("date query param required");

  const slots = await AvailableSlot.find({ date }).populate("teacher_id", "name");
  const open = slots.filter((s) => s.spots_taken < s.max_children);

  return open.map((s) => ({
    id: s._id,
    teacher_id: s.teacher_id._id,
    teacher_name: s.teacher_id.name,
    branch_id: s.branch_id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    max_children: s.max_children,
    spots_taken: s.spots_taken,
  }));
};

// ✅ UPDATED: rescheduleSession now just saves a "pending" preview — parent must confirm
const rescheduleSession = async (sessionId, newSlotId, childId, parentUserId, reason) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");

  const newSlot = await AvailableSlot.findById(newSlotId);
  if (!newSlot) throw new Error("Slot not found");
  if (newSlot.spots_taken >= newSlot.max_children) {
    throw new Error("This slot is already full");
  }

  // Save the chosen slot info on the session as a PENDING reschedule
  // We do NOT change date/teacher/status yet — parent must confirm
  session.pending_slot_id   = newSlot._id;
  session.pending_slot_date = newSlot.date;
  session.pending_slot_start = newSlot.start_time;
  session.pending_slot_end   = newSlot.end_time;
  session.pending_teacher_id = newSlot.teacher_id;
  session.reschedule_reason  = reason || null;
  session.reschedule_status  = "pending";
  await session.save();

  return {
    session_id: session._id,
    pending: true,
    slot: {
      id: newSlot._id,
      teacher_name: (await User.findById(newSlot.teacher_id).select("name"))?.name || "Teacher",
      date: newSlot.date,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
    },
  };
};

// ✅ NEW: Parent confirms (approve) or cancels (reject) the pending reschedule
const confirmReschedule = async (sessionId, decision, parentUserId) => {
  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("decision must be 'approved' or 'rejected'");
  }

  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.reschedule_status !== "pending") {
    throw new Error("No pending reschedule to confirm");
  }

  if (decision === "rejected") {
    // Parent changed their mind — clear pending data
    session.pending_slot_id    = undefined;
    session.pending_slot_date  = undefined;
    session.pending_slot_start = undefined;
    session.pending_slot_end   = undefined;
    session.pending_teacher_id = undefined;
    session.reschedule_reason  = undefined;
    session.reschedule_status  = null;
    await session.save();
    return { session_id: session._id, confirmed: false };
  }

  // decision === "approved" — now actually do the reschedule
  const newSlot = await AvailableSlot.findById(session.pending_slot_id);
  if (!newSlot) throw new Error("Slot not found");
  if (newSlot.spots_taken >= newSlot.max_children) {
    throw new Error("This slot is now full — please pick another");
  }

  const oldSlotDate = session.date;

  session.date       = newSlot.date;
  session.start_time = newSlot.start_time;
  session.end_time   = newSlot.end_time;
  session.teacher_id = newSlot.teacher_id;
  session.status     = "rescheduled";
  session.reschedule_status  = "approved";
  session.pending_slot_id    = undefined;
  session.pending_slot_date  = undefined;
  session.pending_slot_start = undefined;
  session.pending_slot_end   = undefined;
  session.pending_teacher_id = undefined;
  await session.save();

  newSlot.spots_taken += 1;
  await newSlot.save();

  await AuditLog.create({
    action: "session_rescheduled",
    performed_by: parentUserId,
    session_id: session._id,
    new_slot_id: newSlot._id,
    meta_json: {
      original_date: oldSlotDate,
      reason: session.reschedule_reason || null,
      parent_initiated: true,
      parent_confirmed: true,
    },
  });

  await Notification.create({
    user_id: newSlot.teacher_id,
    type: "reschedule_booked",
    title: "New session booked",
    message: `A parent confirmed a rescheduled session to your slot on ${newSlot.date} at ${newSlot.start_time}.`,
  });

  const managersAndAdmins = await User.find({ roles: { $in: ["manager", "admin"] } }).select("_id");
  const notifs = managersAndAdmins.map((u) => ({
    user_id: u._id,
    type: "parent_rescheduled",
    title: "Parent confirmed a reschedule",
    message: `A parent confirmed a reschedule to ${newSlot.date} at ${newSlot.start_time}.`,
    meta_json: { session_id: session._id, new_slot_id: newSlot._id, parent_user_id: parentUserId },
  }));
  if (notifs.length > 0) await Notification.insertMany(notifs);

  let rotation = null;
  try {
    rotation = await checkAndSuggestRotation(session.child_id, newSlot.date, newSlot.branch_id || null);
  } catch (_) {}

  return { session_id: session._id, confirmed: true, rotation };
};

const getShortfalls = async (date) => {
  if (!date) throw new Error("date required");

  const leaves = await LeaveRequest.find({ date, status: "approved" }).populate("teacher_id", "name");

  const shortfalls = await Promise.all(
    leaves.map(async (leave) => {
      const sessions = await Session.find({
        teacher_id: leave.teacher_id._id,
        date,
        status: "scheduled",
      }).populate({
        path: "child_id",
        populate: { path: "parent_user_id", select: "name phone" },
      });

      const confirmed = await Session.countDocuments({
        teacher_id: leave.teacher_id._id,
        date,
        status: "rescheduled",
      });

      const pending = await Promise.all(
        sessions.map(async (s) => {
          const child = s.child_id;
          const parent = child?.parent_user_id;
          const rotation_streak = await getConsecutiveStreak(child?._id, date);
          return {
            session_id: s._id,
            child_id: child?._id,
            child_name: child?.name || "Unknown child",
            parent_name: parent?.name || "Unknown parent",
            parent_phone: parent?.phone || null,
            notified_at: s.createdAt,
            rotation_streak,
          };
        })
      );

      return {
        leave_id: leave._id,
        teacher_id: leave.teacher_id._id,
        teacher_name: leave.teacher_id.name,
        date: leave.date,
        affected_count: sessions.length + confirmed,
        confirmed_count: confirmed,
        pending,
      };
    })
  );

  return shortfalls;
};

const getSubstitutes = async (date, currentBranchId) => {
  if (!date) throw new Error("date required");

  const allTeachers = await User.find({ roles: "teacher" }).lean();
  const leaves = await LeaveRequest.find({ date, status: "approved" }).lean();
  const onLeaveIds = new Set(leaves.map((l) => l.teacher_id.toString()));
  const availableTeachers = allTeachers.filter(t => !onLeaveIds.has(t._id.toString()));

  const substitutes = await Promise.all(
    availableTeachers.map(async (t) => {
      const load = await Session.countDocuments({
        teacher_id: t._id,
        date,
        status: { $in: ["scheduled", "rescheduled"] },
      });
      return {
        id: t._id,
        name: t.name,
        branch_id: t.branch_id,
        is_cross_branch: t.branch_id !== currentBranchId,
        load,
      };
    })
  );

  return substitutes.sort((a, b) => a.load - b.load);
};

const reassignSession = async (sessionId, newTeacherId, adminId) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");

  const newTeacher = await User.findById(newTeacherId);
  if (!newTeacher) throw new Error("Substitute teacher not found");

  const oldTeacherId = session.teacher_id;
  session.teacher_id = newTeacherId;
  await session.save();

  await AuditLog.create({
    action: "session_reassigned",
    performed_by: adminId,
    session_id: session._id,
    meta_json: { old_teacher: oldTeacherId, new_teacher: newTeacherId },
  });

  await Notification.create({
    user_id: newTeacherId,
    type: "session_reassigned",
    title: "Session Reassigned",
    message: `You have been assigned a substitute session on ${session.date} at ${session.start_time}.`,
  });

  return session._id;
};

const getChildSessions = async (childId, from) => {
  const sessions = await Session.find({
    child_id: childId,
    date: { $gte: from },
    status: { $in: ["scheduled", "rescheduled"] },
  })
    .populate("teacher_id", "name")
    .sort({ date: 1, start_time: 1 });

  return sessions.map((s) => ({
    id: s._id,
    child_id: s.child_id,
    teacher_id: s.teacher_id._id,
    teacher_name: s.teacher_id.name,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
  }));
};

module.exports = {
  getMySessions,
  getAvailableSlots,
  rescheduleSession,
  confirmReschedule, // ✅ NEW
  getShortfalls,
  getSubstitutes,
  reassignSession,
  getChildSessions,
};