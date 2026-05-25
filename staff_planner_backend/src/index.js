// src/index.js
// ─────────────────────────────────────────────
// This is where your Express app boots up.
// It connects to MongoDB, registers all routes,
// and starts listening on a port.
// ─────────────────────────────────────────────

require("dotenv").config();           // Load .env variables into process.env
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes         = require("./routes/auth");
const leavesRoutes       = require("./routes/leaves");
const sessionsRoutes     = require("./routes/sessions");
const childrenRoutes     = require("./routes/children");
const notificationsRoutes = require("./routes/notifications");
const adminRoutes        = require("./routes/admin");
const managerRoutes      = require("./routes/manager");
const rolesRoutes        = require("./routes/roles");
const branchesRoutes     = require("./routes/branches"); // ✅ FIX: இந்த line இல்லாததால் branches வரலை

const app = express();

// ── Connect to MongoDB ────────────────────────
connectDB();

// ── Middleware ──────────────────────────────
app.use(cors());                       // Allow requests from your React frontend
app.use(express.json());               // Parse JSON request bodies

// ── Routes ──────────────────────────────────
// All routes are prefixed with /api/v1 — matching your frontend's axiosClient
app.use("/api/v1/auth",          authRoutes);
app.use("/api/v1/leaves",        leavesRoutes);
app.use("/api/v1/sessions",      sessionsRoutes);
app.use("/api/v1/children",      childrenRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/admin",         adminRoutes);
app.use("/api/v1/manager",       managerRoutes);
app.use("/api/v1/roles",         rolesRoutes);
app.use("/api/v1/branches",      branchesRoutes); // ✅ FIX: இந்த line இல்லாததால் branches வரலை

// ── 404 handler ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Error handler ───────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

// ── Start server ─────────────────────────────
app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}/api/v1`)
);