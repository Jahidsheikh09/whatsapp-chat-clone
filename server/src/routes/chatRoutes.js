const express = require("express");
const router = express.Router();
const {
  createChat,
  getChat,
  getChats,
  getChatMessages,
  updateGroupDetails,
  getGroupMembers,
  addGroupMembers,
  removeMember,
  deleteMember,
} = require("../controllers/chatController");

router.post("/", createChat);
router.get("/", getChats);
router.get("/:chatId", getChat);
router.get("/:chatId/messages", getChatMessages);

// Update group details (admin only)
router.put("/:chatId", updateGroupDetails);

// Get group members
router.get("/:chatId/members", getGroupMembers);

// Add members (admin only)
router.post("/:chatId/members", addGroupMembers);

// Remove member (admin only)
router.post("/:chatId/members/remove", removeMember);
router.delete("/:chatId/members/:userId", deleteMember);

module.exports = router;
