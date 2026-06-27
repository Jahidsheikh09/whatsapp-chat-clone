const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
require("../models");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { getIO, emitToUser } = require("../sockets/index.js");

const createChat = asyncHandler(async (req, res) => {
  const { memberIds = [], isGroup = false, name = "", avatarUrl = "" } = req.body;
  const members = Array.from(new Set([req.user.id, ...memberIds]));
  if (!isGroup && members.length !== 2)
    return res.status(400).json({ error: "1:1 chat must have two members" });

  const chat = await Chat.create({
    isGroup,
    name,
    avatarUrl,
    adminId: isGroup ? req.user.id : null,
  });

  const userIds = members.map((id) => String(id));
  const users = await User.findAll({ where: { id: { [Op.in]: userIds } } });
  await chat.setMembers(users);

  const mapped = await Chat.findByPk(chat.id, {
    include: [
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
      { model: Message, as: "lastMessage" },
    ],
  });
  const mappedChat = mapChat(mapped);

  try {
    const io = getIO();
    (mappedChat.members || []).forEach((m) => {
      const uid = m.id;
      if (uid) emitToUser(io, String(uid), "chat:created", mappedChat);
    });
  } catch (err) {
    // noop if socket not ready
  }

  res.json(mappedChat);
});

const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.findAll({
    include: [
      { model: Message, as: "lastMessage" },
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
    ],
    order: [["updatedAt", "DESC"]],
  });

  const visible = chats.filter((chat) =>
    (chat.members || []).some((member) => String(member.id) === String(req.user.id))
  );
  res.json(visible.map(mapChat));
});

const getChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findByPk(req.params.chatId, {
    include: [
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
      { model: Message, as: "lastMessage" },
    ],
  });
  if (!chat || !(chat.members || []).some((member) => String(member.id) === String(req.user.id)))
    return res.status(404).json({ error: "Not found" });
  res.json(mapChat(chat));
});

const getChatMessages = asyncHandler(async (req, res) => {
  const { limit = 50, before } = req.query;
  const chat = await Chat.findByPk(req.params.chatId);
  if (!chat || !(await chat.hasMember(req.user.id)))
    return res.status(404).json({ error: "Not found" });
  const where = { chatId: chat.id };
  if (before) where.createdAt = { [Op.lt]: new Date(before) };
  const items = await Message.findAll({ where, order: [["createdAt", "DESC"]], limit: Number(limit) });
  res.json(items.reverse().map(mapMessage));
});

const updateGroupDetails = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;
  const chat = await Chat.findByPk(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (String(chat.adminId || "") !== String(req.user.id))
    return res.status(403).json({ error: "Forbidden" });
  if (typeof name === "string") chat.name = name;
  if (typeof avatarUrl === "string") chat.avatarUrl = avatarUrl;
  await chat.save();
  const populated = await Chat.findByPk(chat.id, {
    include: [
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
      { model: Message, as: "lastMessage" },
    ],
  });
  res.json(mapChat(populated));
});

const getGroupMembers = asyncHandler(async (req, res) => {
  const chat = await Chat.findByPk(req.params.chatId, {
    include: [{ model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] }],
  });
  if (!chat || !(chat.members || []).some((member) => String(member.id) === String(req.user.id)))
    return res.status(404).json({ error: "Not found" });
  res.json({
    members: (chat.members || []).map(mapUser),
    admin: chat.adminId || null,
  });
});

const addGroupMembers = asyncHandler(async (req, res) => {
  const { memberIds = [] } = req.body;
  const chat = await Chat.findByPk(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (String(chat.adminId || "") !== String(req.user.id))
    return res.status(403).json({ error: "Forbidden" });
  const users = await User.findAll({ where: { id: { [Op.in]: memberIds.map(String) } } });
  await chat.addMember(users);
  const populated = await Chat.findByPk(chat.id, {
    include: [
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
      { model: Message, as: "lastMessage" },
    ],
  });
  res.json(mapChat(populated));
});

const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await Chat.findByPk(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (String(chat.adminId || "") !== String(req.user.id))
    return res.status(403).json({ error: "Forbidden" });
  await chat.removeMember(userId);
  const populated = await Chat.findByPk(chat.id, {
    include: [
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
      { model: Message, as: "lastMessage" },
    ],
  });
  res.json(mapChat(populated));
});

const deleteMember = asyncHandler(async (req, res) => {
  const chat = await Chat.findByPk(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (String(chat.adminId || "") !== String(req.user.id))
    return res.status(403).json({ error: "Forbidden" });
  const removeId = req.params.userId;
  await chat.removeMember(removeId);
  const populated = await Chat.findByPk(chat.id, {
    include: [
      { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
      { model: Message, as: "lastMessage" },
    ],
  });
  res.json(mapChat(populated));
});

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    avatarUrl: u.avatarUrl,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen,
  };
}

function mapChat(c) {
  if (!c) return null;
  return {
    id: c.id,
    isGroup: c.isGroup,
    name: c.name,
    avatarUrl: c.avatarUrl,
    members: (c.members || []).map(mapUser),
    admin: c.adminId || null,
    lastMessage: c.lastMessage ? mapMessage(c.lastMessage) : null,
    typing: c.typing,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  };
}

function mapMessage(m) {
  if (!m) return null;
  return {
    id: m.id,
    chat: m.chatId,
    sender: m.senderId,
    content: m.content,
    media: m.media,
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

module.exports = {
  createChat,
  getChat,
  getChats,
  getChatMessages,
  updateGroupDetails,
  getGroupMembers,
  addGroupMembers,
  removeMember,
  deleteMember,
};
