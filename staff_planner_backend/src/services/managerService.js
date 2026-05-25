const Session = require("../models/Session");
const LeaveRequest = require("../models/LeaveRequest");
const AuditLog = require("../models/AuditLog");
const Notification = require("../models/Notification");

/**
 * Return all rescheduled sessions awaiting manager review.
 * Sessions with status "rescheduled" that haven't been explicitly
 * approved/rejected yet are surfaced here.
 */
const getPendingReschedules = async () => {
  const sessions = await Session.find({ status: "rescheduled" })
    .populate("teacher_id", "name email")
    .populate({
      path: "child_id",
      populate: { path: "parent_user_id", select: "name email phone" },
    })
    .sort({ updatedAt: -1 });

  return sessions.map((s) => ({
    id: s._id,
    teacher_id: s.teacher_id?._id,
    teacher_name: s.teacher_id?.name,
    child_id: s.child_id?._id,
    child_name: s.child_id?.name,
    parent_id: s.child_id?.parent_user_id?._id,
    parent_name: s.child_id?.parent_user_id?.name,
    branch_id: s.branch_id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
    reschedule_status: s.reschedule_status || "pending",
    updated_at: s.updatedAt,
    created_at: s.createdAt,
  }));
};

/**
 * Approve or reject a reschedule request.
 */
const decideReschedule = async (sessionId, decision, managerId) => {
  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("decision must be 'approved' or 'rejected'");
  }

  const session = await Session.findById(sessionId);
  if (!session) throw new Error("Session not found");

  session.reschedule_status = decision;
  if (decision === "rejected") {
    // Revert to scheduled so it shows up as needing attention
    session.status = "scheduled";
  }
  await session.save();

  // Notify parent
  const childDoc = await session.populate({
    path: "child_id",
    populate: { path: "parent_user_id", select: "_id" },
  });
  const parentId = childDoc.child_id?.parent_user_id?._id;
  if (parentId) {
    await Notification.create({
      user_id: parentId,
      type: `reschedule_${decision}`,
      title: `Reschedule ${decision}`,
      message: `Your session reschedule request for ${session.date} has been ${decision}.`,
      meta_json: { session_id: session._id },
    });
  }

  await AuditLog.create({
    action: `reschedule_${decision}`,
    performed_by: managerId,
    session_id: session._id,
    meta_json: { decision },
  });

  return session._id;
};

/**
 * Counts for the Manager dashboard.
 */
const getDashboardStats = async () => {
  const [pendingLeaves, rescheduledSessions, approvedLeaves, rejectedLeaves] =
    await Promise.all([
      LeaveRequest.countDocuments({ status: "pending" }),
      Session.countDocuments({ status: "rescheduled", reschedule_status: { $in: [null, undefined, "pending"] } }),
      LeaveRequest.countDocuments({ status: "approved" }),
      LeaveRequest.countDocuments({ status: "rejected" }),
    ]);

  return {
    pending_leaves: pendingLeaves,
    pending_reschedules: rescheduledSessions,
    approved_leaves: approvedLeaves,
    rejected_leaves: rejectedLeaves,
  };
};

module.exports = {
  getPendingReschedules,
  decideReschedule,
  getDashboardStats,
};
