const Server = require("socket.io").Server;
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");

const userIdToSockets = new Map();
const socketIdToUser = new Map();

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

function initSocket(server, corsOrigin) {
  const io = new Server(server, {
    cors: { origin: corsOrigin, methods: ["GET", "POST"], credentials: true },
  });

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

    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit("user:presence", { userId, isOnline: true, lastSeen: null });

    socket.on("typing", ({ chatId, typing }) => {
      Chat.findById(chatId).then((chat) => {
        if (!chat) return;
        chat.members.forEach((mid) => {
          if (mid.toString() !== userId)
            emitToUser(io, mid.toString(), "typing", {
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
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.members.map(String).includes(userId))
          return ack?.({ error: "Not a member" });
        const status = {};
        chat.members.forEach((m) => {
          if (m.toString() !== userId) status[m.toString()] = "sent";
        });

        const message = await Message.create({
          chat: chat._id,
          sender: userId,
          content,
          media,
          status,
        });
        chat.lastMessage = message._id;
        await chat.save();

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

        const outMsg = {
          id: message._id.toString(),
          chat: message.chat?.toString ? message.chat.toString() : String(message.chat),
          sender: message.sender?.toString ? message.sender.toString() : String(message.sender),
          content: message.content,
          media: message.media || [],
          status: normalizeStatus(message.status),
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        };

        // Emit normalized message to all members (including sender)
        chat.members.forEach((m) => {
          const target = m.toString();
          const sockets = userIdToSockets.get(target);
          console.info(`[sockets] emit message ${outMsg.id} to user=${target} sockets=${sockets ? sockets.size : 0}`);
          emitToUser(io, target, "message:new", outMsg);
        });

        // Ack with normalized message
        ack?.({ ok: true, message: outMsg });
      } catch (e) {
        ack?.({ error: "Server error" });
      }
    });

    socket.on("message:delivered", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.status.set(userId, "delivered");
      await msg.save();
      emitToUser(io, msg.sender.toString(), "message:status", {
        messageId,
        userId,
        status: "delivered",
      });
    });

    socket.on("message:seen", async ({ messageIds = [] }) => {
      const msgs = await Message.find({ _id: { $in: messageIds } });
      for (const msg of msgs) {
        msg.status.set(userId, "seen");
        await msg.save();
        emitToUser(io, msg.sender.toString(), "message:status", {
          messageId: msg._id.toString(),
          userId,
          status: "seen",
        });
      }
    });

    socket.on("disconnect", async () => {
      const uid = removeUserSocket(socket.id);
      if (uid && !userIdToSockets.get(uid)?.size) {
        await User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() });
        socket.broadcast.emit("user:presence", {
          userId: uid,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      }
    });
  });

  return io;
}

module.exports = initSocket;
