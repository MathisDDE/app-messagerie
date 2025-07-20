const {
  exportToJSON,
  exportToTXT,
  exportAllConversations
} = require("../controllers/exportController");

const router = require("express").Router();

// Export Routes
router.get("/json/:userId", exportToJSON);
router.get("/txt/:userId", exportToTXT);
router.get("/all/:userId", exportAllConversations);

module.exports = router; 