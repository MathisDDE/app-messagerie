const { addMessage, getAllMessages, searchMessages } = require("../controllers/msgController");
const { 
  addReaction, 
  getReactions, 
  editMessage, 
  deleteMessage, 
  createEphemeralMessage,
  replyToMessage,
  uploadFile 
} = require("../controllers/advancedMsgController");

const router = require("express").Router();

// Message Routes
router.post("/addmsg", addMessage);
router.post("/getmsg", getAllMessages);
router.get("/search/:userId", searchMessages);

// Advanced Message Routes
router.post("/reaction", addReaction);
router.get("/reactions/:messageId", getReactions);
router.post("/edit", editMessage);
router.post("/delete", deleteMessage);
router.post("/ephemeral", createEphemeralMessage);
router.post("/reply", replyToMessage);
router.post("/upload", uploadFile);

module.exports = router;
