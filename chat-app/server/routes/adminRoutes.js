const {
  getDashboardStats,
  getAllUsersAdmin,
  toggleBanUser,
  getActivityLogs,
  getModerationLogs,
} = require("../controllers/adminController");

const router = require("express").Router();

// Admin Routes
router.get("/stats/:userId", getDashboardStats);
router.get("/users/:userId", getAllUsersAdmin);
router.put("/ban/:adminId/:userId", toggleBanUser);
router.get("/logs/:userId", getActivityLogs);
router.get("/moderation/:userId", getModerationLogs);

module.exports = router; 