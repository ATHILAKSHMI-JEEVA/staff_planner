const adminService = require("../services/adminService");

const getAuditLogs = async (req, res) => {
  try {
    const entries = await adminService.getAuditLogs();
    res.json({ logs: entries, entries });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAuditLogs,
};
