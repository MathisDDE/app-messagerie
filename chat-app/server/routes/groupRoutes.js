const {
  createGroup,
  getUserGroups,
  getGroupMessages,
  sendGroupMessage,
  addGroupMembers,
  leaveGroup
} = require("../controllers/groupController");

const router = require("express").Router();

// Group Routes
router.post("/create/:userId", createGroup);
router.get("/user/:userId", getUserGroups);
router.get("/:groupId/messages/:userId", getGroupMessages);
router.post("/message/:userId", sendGroupMessage);
router.post("/:groupId/members/:userId", addGroupMembers);
router.delete("/:groupId/leave/:userId", leaveGroup);

module.exports = router; 