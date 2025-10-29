const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
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
    members,
    admin: isGroup ? req.user.id : undefined,
  });
  // Map chat object to use 'id' instead of '_id' and map members
  const mapped = await Chat.findById(chat._id)
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .populate("lastMessage");
  const mappedChat = mapChat(mapped);

  // Realtime: notify all members that a new chat was created
  try {
    const io = getIO();
    (mappedChat.members || []).forEach((m) => {
      const uid = m.id || m._id;
      if (uid) emitToUser(io, String(uid), "chat:created", mappedChat);
    });
  } catch (err) {
    // noop if socket not ready
  }

  res.json(mappedChat);
});

const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ members: req.user.id })
    .populate("lastMessage")
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .sort({ updatedAt: -1 });
  res.json(chats.map(mapChat));
});

const getChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .populate("lastMessage");
  if (!chat || !chat.members.map(String).includes(req.user.id))
    return res.status(404).json({ error: "Not found" });
  res.json(mapChat(chat));
});

const getChatMessages = asyncHandler(async (req, res) => {
  const { limit = 50, before } = req.query;
  const chat = await Chat.findById(req.params.chatId);
  if (!chat || !chat.members.map(String).includes(req.user.id))
    return res.status(404).json({ error: "Not found" });
  const filter = { chat: chat._id };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
  res.json(items.reverse().map(mapMessage));
});

const updateGroupDetails = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (chat.admin?.toString() !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });
  if (typeof name === "string") chat.name = name;
  if (typeof avatarUrl === "string") chat.avatarUrl = avatarUrl;
  await chat.save();
  const populated = await Chat.findById(chat._id)
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .populate("lastMessage");
  res.json(mapChat(populated));
});

const getGroupMembers = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId).populate({
    path: "members",
    select: "username name avatarUrl isOnline lastSeen",
  });
  if (!chat || !chat.members.map(String).includes(req.user.id))
    return res.status(404).json({ error: "Not found" });
  res.json({
    members: chat.members.map(mapUser),
    admin: chat.admin?.toString() || null
  });
});

const addGroupMembers = asyncHandler(async (req, res) => {
  const { memberIds = [] } = req.body;
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (chat.admin?.toString() !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });
  const toAdd = (Array.isArray(memberIds) ? memberIds : []).map(String);
  const set = new Set(chat.members.map((m) => m.toString()));
  for (const id of toAdd) set.add(id);
  chat.members = Array.from(set);
  await chat.save();
  const populated = await Chat.findById(chat._id)
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .populate("lastMessage");
  res.json(mapChat(populated));
});

const removeMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (chat.admin?.toString() !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });
  chat.members = chat.members.filter((m) => m.toString() !== userId);
  await chat.save();
  const populated = await Chat.findById(chat._id)
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .populate("lastMessage");
  res.json(mapChat(populated));
});

const deleteMember = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) return res.status(404).json({ error: "Not found" });
  if (!chat.isGroup) return res.status(400).json({ error: "Not a group" });
  if (chat.admin?.toString() !== req.user.id)
    return res.status(403).json({ error: "Forbidden" });
  const removeId = req.params.userId;
  chat.members = chat.members.filter((m) => m.toString() !== removeId);
  await chat.save();
  const populated = await Chat.findById(chat._id)
    .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
    .populate("lastMessage");
  res.json(mapChat(populated));
});

// --- Mapping helpers ---
function mapUser(u) {
  if (!u) return null;
  return {
    id: u._id?.toString?.() || u.id || u,
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
    id: c._id?.toString?.() || c.id || c,
    isGroup: c.isGroup,
    name: c.name,
    avatarUrl: c.avatarUrl,
    members: (c.members || []).map(mapUser),
    admin: c.admin?.toString?.() || c.admin || null,
    lastMessage: c.lastMessage ? mapMessage(c.lastMessage) : null,
    typing: c.typing,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  };
}

function mapMessage(m) {
  if (!m) return null;
  return {
    id: m._id?.toString?.() || m.id || m,
    chat: m.chat?._id?.toString?.() || m.chat?.id || m.chat,
    sender: m.sender?._id?.toString?.() || m.sender?.id || m.sender,
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
