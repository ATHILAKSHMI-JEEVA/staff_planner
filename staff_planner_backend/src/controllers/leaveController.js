const leaveService = require("../services/leaveService");

const getMyLeaves = async (req, res) => {
  try {
    const leaves = await leaveService.getMyLeaves(req.user._id, req.user.name);
    res.json({ leaves });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPendingLeaves = async (req, res) => {
  try {
    const leaves = await leaveService.getPendingLeaves();
    res.json({ leaves });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const applyLeave = async (req, res) => {
  try {
    const leave = await leaveService.applyLeave(req.user._id, req.user.name, req.body);
    res.status(201).json({ leave });
  } catch (err) {
    if (err.message === "date and reason are required") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "You already have a leave request for this date") {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const makeDecision = async (req, res) => {
  try {
    const { decision } = req.body;
    const leaveId = await leaveService.makeDecision(req.params.id, decision, req.user._id);
    res.json({ message: `Leave ${decision}`, leave_id: leaveId });
  } catch (err) {
    if (err.message === "decision must be 'approved' or 'rejected'") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Leave not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

// ✅ NEW: Edit a pending leave request
const updateLeave = async (req, res) => {
  try {
    const leave = await leaveService.updateLeave(req.params.id, req.user._id, req.body);
    res.json({ leave });
  } catch (err) {
    if (err.message === "Leave not found")
      return res.status(404).json({ message: err.message });
    if (err.message === "Forbidden")
      return res.status(403).json({ message: err.message });
    if (
      err.message === "Only pending leave requests can be edited" ||
      err.message === "date and reason are required" ||
      err.message === "You already have a leave request for this date"
    )
      return res.status(400).json({ message: err.message });
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyLeaves,
  getPendingLeaves,
  applyLeave,
  makeDecision,
  updateLeave, // ✅ NEW
};