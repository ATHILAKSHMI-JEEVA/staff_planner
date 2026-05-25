const childService = require("../services/childService");

const getMyChildren = async (req, res) => {
  try {
    const children = await childService.getMyChildren(req.user._id);
    res.json({ children });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getMyChildren,
};
