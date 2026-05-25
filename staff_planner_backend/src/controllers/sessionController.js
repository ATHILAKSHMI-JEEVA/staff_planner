const sessionService = require("../services/sessionService");
const Child = require("../models/Child");

const getMySessions = async (req, res) => {
  try {
    const { date } = req.query;
    const sessions = await sessionService.getMySessions(req.user._id, req.user.name, date);
    res.json({ sessions });
  } catch (err) {
    if (err.message === "date query param required") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    const slots = await sessionService.getAvailableSlots(date);
    res.json({ slots });
  } catch (err) {
    if (err.message === "date query param required") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const rescheduleSession = async (req, res) => {
  try {
    const { new_slot_id, child_id, reason } = req.body;
    const result = await sessionService.rescheduleSession(
      req.params.id,
      new_slot_id,
      child_id,
      req.user._id,
      reason
    );
    res.json({
      message: "Slot selected — awaiting your confirmation",
      session_id: result.session_id,
      pending: result.pending,
      slot: result.slot,
    });
  } catch (err) {
    if (err.message === "Session not found" || err.message === "Slot not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "This slot is already full") {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

// ✅ NEW: Parent confirms or rejects their pending reschedule
const confirmReschedule = async (req, res) => {
  try {
    const { decision } = req.body; // "approved" or "rejected"
    const result = await sessionService.confirmReschedule(
      req.params.id,
      decision,
      req.user._id
    );
    res.json({
      message: result.confirmed ? "Reschedule confirmed!" : "Reschedule cancelled",
      session_id: result.session_id,
      confirmed: result.confirmed,
      rotation: result.rotation ?? null,
    });
  } catch (err) {
    if (err.message === "Session not found") {
      return res.status(404).json({ message: err.message });
    }
    if (
      err.message === "No pending reschedule to confirm" ||
      err.message === "decision must be 'approved' or 'rejected'"
    ) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "This slot is now full — please pick another") {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const getShortfalls = async (req, res) => {
  try {
    const { date } = req.query;
    const shortfalls = await sessionService.getShortfalls(date);
    res.json({ shortfalls });
  } catch (err) {
    if (err.message === "date required") {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const getSubstitutes = async (req, res) => {
  try {
    const { date, branch_id } = req.query;
    if (!date) return res.status(400).json({ message: "date required" });
    const substitutes = await sessionService.getSubstitutes(date, branch_id);
    res.json({ substitutes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const reassignSession = async (req, res) => {
  try {
    const { new_teacher_id } = req.body;
    if (!new_teacher_id) return res.status(400).json({ message: "new_teacher_id required" });
    const session_id = await sessionService.reassignSession(
      req.params.id,
      new_teacher_id,
      req.user._id
    );
    res.json({ message: "Session reassigned successfully", session_id });
  } catch (err) {
    if (err.message === "Session not found" || err.message === "Substitute teacher not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const getChildSessions = async (req, res) => {
  try {
    const { child_id, from } = req.query;
    if (!child_id) return res.status(400).json({ message: "child_id required" });

    const fromDate = from || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const child = await Child.findOne({ _id: child_id, parent_user_id: req.user._id });
    if (!child) return res.status(403).json({ message: "Child not found or access denied" });

    const sessions = await sessionService.getChildSessions(child_id, fromDate);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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