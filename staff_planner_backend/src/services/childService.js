const Child = require("../models/Child");

const getMyChildren = async (parentId) => {
  const children = await Child.find({ parent_user_id: parentId });
  return children.map((c) => ({
    id: c._id,
    name: c.name,
    parent_user_id: c.parent_user_id,
    branch_id: c.branch_id,
    assigned_teacher_id: c.assigned_teacher_id,
  }));
};

module.exports = {
  getMyChildren,
};
