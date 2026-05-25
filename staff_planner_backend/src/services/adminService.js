const AuditLog = require("../models/AuditLog");

const getAuditLogs = async () => {
  const logs = await AuditLog.find()
    .populate("performed_by", "name")
    .sort({ createdAt: -1 })
    .limit(100);

  const entries = logs.map((l) => ({
    id: l._id,
    action: l.action,
    performed_by: l.performed_by._id,
    performer_name: l.performed_by.name,
    session_id: l.session_id,
    old_slot_id: l.old_slot_id,
    new_slot_id: l.new_slot_id,
    meta_json: l.meta_json,
    created_at: l.createdAt,
  }));

  return entries;
};

module.exports = {
  getAuditLogs,
};
