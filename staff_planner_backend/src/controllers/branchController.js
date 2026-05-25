// src/controllers/branchController.js
const branchService = require("../services/branchService");

const getAllBranches = async (req, res) => {
  try {
    const branches = await branchService.getAllBranches();
    res.json({ branches });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getBranch = async (req, res) => {
  try {
    const branch = await branchService.getBranchById(req.params.id);
    res.json({ branch });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const createBranch = async (req, res) => {
  try {
    const branch = await branchService.createBranch(req.body, req.user._id);
    res.status(201).json({ branch });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const updateBranch = async (req, res) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body);
    res.json({ branch });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const deleteBranch = async (req, res) => {
  try {
    const result = await branchService.deleteBranch(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const addMember = async (req, res) => {
  try {
    const user = await branchService.addMemberToBranch(req.params.id, req.body);
    res.status(201).json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const result = await branchService.removeMemberFromBranch(req.params.id, req.params.userId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = {
  getAllBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  addMember,
  removeMember,
};