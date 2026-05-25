const authService = require("../services/authService");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (err) {
    if (err.message === "Invalid email or password") {
      return res.status(401).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

const getMe = (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      branch_id: req.user.branch_id,
      roles: req.user.roles,
      role_id: req.user.role_id ?? null,
    },
  });
};

module.exports = {
  login,
  getMe,
};