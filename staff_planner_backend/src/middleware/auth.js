const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  const hasRole = roles.some((r) => req.user.roles.includes(r));
  if (!hasRole) return res.status(403).json({ message: "Forbidden: insufficient role" });
  next();
};

const ACTION_HIERARCHY = {
  read:               ["read", "read_write", "read_write_delete"],
  read_write:         ["read_write", "read_write_delete"],
  read_write_delete:  ["read_write_delete"],
  approve:            ["approve"],
  manage:             ["manage"],
};

const requirePermission = (resource, action) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.roles?.includes("admin")) return next();

  const roleId = req.user.role_id;
  if (!roleId) return res.status(403).json({ message: "No role assigned" });

  try {
    const role = await Role.findById(roleId);
    if (!role) return res.status(403).json({ message: "Role not found" });

    const equivalentActions = ACTION_HIERARCHY[action] ?? [action];
    const hasPermission = role.permissions.some(
      (p) => p.resource === resource && equivalentActions.includes(p.action)
    );
    if (!hasPermission) {
      return res.status(403).json({
        message: `Forbidden: requires '${action}' permission on '${resource}'`,
      });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: "Permission check failed" });
  }
};

module.exports = { protect, requireRole, requirePermission };