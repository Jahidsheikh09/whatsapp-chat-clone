const Server = require("socket.io").Server;
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { isAllowedClientOrigin } = require("../utils/authUtils");
require("../models");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");

const userIdToSockets = new Map();
const socketIdToUser = new Map();
let ioInstance = null;

function addUserSocket(userId, socketId) {
  const set = userIdToSockets.get(userId) || new Set();
  set.add(socketId);
  userIdToSockets.set(userId, set);
  socketIdToUser.set(socketId, userId);
}

function removeUserSocket(socketId) {
  const userId = socketIdToUser.get(socketId);
  if (!userId) return;
  const set = userIdToSockets.get(userId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) userIdToSockets.delete(userId);
  }
  socketIdToUser.delete(socketId);
  return userId;
}

function emitToUser(io, userId, event, payload) {
  const set = userIdToSockets.get(userId) || new Set();
  if (!set || set.size === 0) {
    console.debug(`[sockets] emitToUser: no sockets for user ${userId} (event: ${event})`);
  }
  for (const sid of set) {
    io.to(sid).emit(event, payload);
  }
}

function initSocket(server) {
  try {
    const io = new Server(server, {
      cors: {
        origin(origin, callback) {
          if (isAllowedClientOrigin(origin)) return callback(null, true);
          return callback(new Error("Not allowed by Socket.IO CORS"), false);
        },
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    ioInstance = io;

    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token || null;
        if (!token) return next(new Error("Unauthorized"));
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.id;
        next();
      } catch (e) {
        next(new Error("Unauthorized"));
      }
    });

    io.on("connection", async (socket) => {
      const userId = socket.userId;
      addUserSocket(userId, socket.id);
      console.info(`[sockets] connected user=${userId} socket=${socket.id}`);

      try {
        await User.update({ isOnline: true }, { where: { id: userId } });
      } catch (err) {
        console.warn(`[sockets] failed to update user status:`, err.message);
      }
      
      socket.broadcast.emit("user:presence", { userId, isOnline: true, lastSeen: null });

    // Join the socket to rooms for each chat the user is a member of.
    // This makes emitting to a chat reliable even if users have multiple sockets.
    try {
      const userChats = await Chat.findAll({ include: [{ model: User, as: "members", attributes: ["id"] }] });
      for (const c of userChats.filter((chat) => (chat.members || []).some((member) => String(member.id) === String(userId)))) {
        const room = c.id;
        socket.join(room);
        console.info(`[sockets] socket=${socket.id} joined room=${room}`);
      }
    } catch (err) {
      console.warn(`[sockets] failed to join rooms for user=${userId}:`, err.message || err);
    }

    socket.on("typing", ({ chatId, typing }) => {
      Chat.findByPk(chatId, { include: [{ model: User, as: "members", attributes: ["id"] }] }).then((chat) => {
        if (!chat) return;
        (chat.members || []).forEach((member) => {
          if (String(member.id) !== String(userId))
            emitToUser(io, String(member.id), "typing", {
              chatId,
              userId,
              typing: !!typing,
            });
        });
      });
    });

    socket.on("message:send", async (data, ack) => {
      try {
        const { chatId, content, media = [] } = data;
        const chat = await Chat.findByPk(chatId, { include: [{ model: User, as: "members", attributes: ["id"] }] });
        const memberIds = (chat?.members || []).map((member) => String(member.id));
        if (!chat || !memberIds.includes(String(userId)))
          return ack?.({ error: "Not a member" });
        const status = {};
        memberIds.forEach((memberId) => {
          if (memberId !== String(userId)) status[memberId] = "sent";
        });

        const message = await Message.create({
          chatId: chat.id,
          senderId: userId,
          content,
          media,
          status,
        });
        await chat.update({ lastMessageId: message.id });

        // normalize status (Map or object) to plain object
        const normalizeStatus = (st) => {
          const out = {};
          if (!st) return out;
          if (typeof st.entries === "function") {
            for (const [k, v] of st.entries()) out[k] = v;
          } else if (typeof st === "object") {
            Object.assign(out, st);
          }
          return out;
        };

        // Prepare a lightweight chat info snapshot for receivers who might not have this chat locally yet
        let chatInfo = null;
        try {
          const pop = await Chat.findByPk(chat.id, {
            include: [
              { model: User, as: "members", attributes: ["id", "username", "name", "avatarUrl", "isOnline", "lastSeen"] },
              { model: Message, as: "lastMessage" },
            ],
          });
          chatInfo = {
            id: pop.id,
            isGroup: pop.isGroup,
            name: pop.name,
            avatarUrl: pop.avatarUrl,
            members: (pop.members || []).map((u) => ({
              id: u.id,
              username: u.username,
              name: u.name,
              avatarUrl: u.avatarUrl,
              isOnline: u.isOnline,
              lastSeen: u.lastSeen,
            })),
            admin: pop.adminId || null,
          };
        } catch (e) {
          // non-fatal; receivers can still fetch via REST
        }

        const outMsg = {
          id: message.id,
          chat: message.chatId,
          sender: message.senderId,
          content: message.content,
          media: message.media || [],
          status: normalizeStatus(message.status),
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
          chatInfo,
        };

        // Emit to the chat room AND directly to each member's sockets to ensure delivery
        // even if a user hasn't joined the room yet (e.g., newly created chats).
        try {
          io.to(outMsg.chat).emit("message:new", outMsg);
          console.info(`[sockets] emitted message ${outMsg.id} to room=${outMsg.chat}`);
        } catch (err) {
          console.warn(`[sockets] failed to emit to room=${outMsg.chat}:`, err.message || err);
        }
        // Always emit directly to members as a reliability measure
        memberIds.forEach((target) => {
          const sockets = userIdToSockets.get(target);
          console.info(`[sockets] emit message ${outMsg.id} directly to user=${target} sockets=${sockets ? sockets.size : 0}`);
          emitToUser(io, target, "message:new", outMsg);
        });

        // Ack with normalized message
        ack?.({ ok: true, message: outMsg });
      } catch (e) {
        ack?.({ error: "Server error" });
      }
    });

    // Allow clients to request joining a chat room dynamically
    socket.on("chat:join", (chatId) => {
      if (!chatId) return;
      try {
        const room = String(chatId);
        socket.join(room);
        console.info(`[sockets] socket=${socket.id} joined room=${room} via chat:join`);
      } catch (err) {
        console.warn(`[sockets] chat:join failed for socket=${socket.id} chat=${chatId}:`, err.message || err);
      }
    });

    socket.on("message:delivered", async ({ messageId }) => {
      const msg = await Message.findByPk(messageId);
      if (!msg) return;
      const status = { ...(msg.status || {}) };
      status[userId] = "delivered";
      await msg.update({ status });
      emitToUser(io, String(msg.senderId), "message:status", {
        messageId,
        userId,
        status: "delivered",
      });
    });

    socket.on("message:seen", async ({ messageIds = [] }) => {
      const msgs = await Message.findAll({ where: { id: { [Op.in]: messageIds } } });
      for (const msg of msgs) {
        const status = { ...(msg.status || {}) };
        status[userId] = "seen";
        await msg.update({ status });
        emitToUser(io, String(msg.senderId), "message:status", {
          messageId: msg.id,
          userId,
          status: "seen",
        });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const uid = removeUserSocket(socket.id);
        if (uid && !userIdToSockets.get(uid)?.size) {
          await User.update({ isOnline: false, lastSeen: new Date() }, { where: { id: uid } });
          socket.broadcast.emit("user:presence", {
            userId: uid,
            isOnline: false,
            lastSeen: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn(`[sockets] disconnect error for socket=${socket.id}:`, err.message);
      }
    });
  });

  console.log("✅ Socket.IO initialized successfully");
  return io;
} catch (error) {
  console.error("❌ Socket.IO initialization failed:", error.message);
  console.error(error.stack);
  // Still return a dummy io to prevent server crash
  return {
    emit: () => {},
    on: () => {},
    to: () => ({ emit: () => {} }),
    broadcast: { emit: () => {} },
  };
}

function getIO() {
  if (!ioInstance) throw new Error("Socket.IO not initialized yet");
  return ioInstance;
}

module.exports = { initSocket, getIO, emitToUser };
