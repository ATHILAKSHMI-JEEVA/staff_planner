const { checkAndSuggestRotation } = require("../services/rotationService");

/**
 * GET /sessions/rotation-check?child_id=...&date=...&branch_id=...
 * Admin-only. Returns streak info and optional teacher suggestion.
 */
const checkRotation = async (req, res) => {
  try {
    const { child_id, date, branch_id } = req.query;

    if (!child_id || !date) {
      return res.status(400).json({ message: "child_id and date are required" });
    }

    const result = await checkAndSuggestRotation(child_id, date, branch_id || null);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { checkRotation };
