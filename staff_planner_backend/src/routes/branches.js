// src/routes/branches.js
const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const branchController = require("../controllers/branchController");

const router = express.Router();

// All branch routes — admin only
router.use(protect, requireRole("admin"));

// Branch CRUD
router.get("/",           branchController.getAllBranches);  // GET  /api/v1/branches
router.get("/:id",        branchController.getBranch);       // GET  /api/v1/branches/:id
router.post("/",          branchController.createBranch);    // POST /api/v1/branches
router.put("/:id",        branchController.updateBranch);    // PUT  /api/v1/branches/:id
router.delete("/:id",     branchController.deleteBranch);    // DELETE /api/v1/branches/:id

// Member management within a branch
router.post("/:id/members",            branchController.addMember);     // POST   /api/v1/branches/:id/members
router.delete("/:id/members/:userId",  branchController.removeMember);  // DELETE /api/v1/branches/:id/members/:userId

module.exports = router;