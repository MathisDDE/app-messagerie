const router = require("express").Router();
const {
  analyzeMessage,
  checkURL,
  moderateBeforeSend,
  getFlaggedMessages,
  reportMessage,
  getModerationStats,
  getMessageAnalysis
} = require("../controllers/moderationController");

// Analyser un message
router.post("/analyze", analyzeMessage);

// Vérifier un URL
router.post("/check-url", checkURL);

// Modérer avant l'envoi
router.post("/moderate", moderateBeforeSend);

// Obtenir les messages suspects
router.get("/flagged/:userId", getFlaggedMessages);

// Signaler un message
router.post("/report", reportMessage);

// Obtenir les statistiques de modération
router.get("/stats/:userId", getModerationStats);

// Obtenir l'analyse d'un message
router.get("/logs/:messageId", getMessageAnalysis);

module.exports = router; 