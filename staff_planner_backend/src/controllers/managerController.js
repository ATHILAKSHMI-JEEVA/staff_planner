const managerService = require("../services/managerService");

const getPendingReschedules = async (req, res) => {
  try {
    const sessions = await managerService.getPendingReschedules();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const approveReschedule = async (req, res) => {
  try {
    const { decision } = req.body;
    const session = await managerService.decideReschedule(
      req.params.id,
      decision,
      req.user._id
    );
    res.json({ message: `Reschedule ${decision}`, session_id: session });
  } catch (err) {
    if (err.message === "decision must be 'approved' or 'rejected'") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Session not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = await managerService.getDashboardStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPendingReschedules,
  approveReschedule,
  getDashboardStats,
};
