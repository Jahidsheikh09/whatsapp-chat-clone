const Server = require("socket.io").Server;
const jwt = require("jsonwebtoken");
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

function initSocket(server, corsOrigin) {
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        try {
          if (!origin) return callback(null, true); // allow file:// and same-origin
          if (Array.isArray(corsOrigin) && corsOrigin.includes(origin)) return callback(null, true);
          return callback(new Error("Not allowed by Socket.IO CORS"), false);
        } catch (e) {
          return callback(null, true);
        }
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

    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit("user:presence", { userId, isOnline: true, lastSeen: null });

    // Join the socket to rooms for each chat the user is a member of.
    // This makes emitting to a chat reliable even if users have multiple sockets.
    try {
      const userChats = await Chat.find({ members: userId }).select("_id");
      for (const c of userChats) {
        const room = c._id.toString();
        socket.join(room);
        console.info(`[sockets] socket=${socket.id} joined room=${room}`);
      }
    } catch (err) {
      console.warn(`[sockets] failed to join rooms for user=${userId}:`, err.message || err);
    }

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

        // Prepare a lightweight chat info snapshot for receivers who might not have this chat locally yet
        let chatInfo = null;
        try {
          const pop = await Chat.findById(chat._id)
            .populate({ path: "members", select: "username name avatarUrl isOnline lastSeen" })
            .populate("lastMessage");
          chatInfo = {
            id: pop._id.toString(),
            isGroup: pop.isGroup,
            name: pop.name,
            avatarUrl: pop.avatarUrl,
            members: (pop.members || []).map((u) => ({
              id: u._id.toString(),
              username: u.username,
              name: u.name,
              avatarUrl: u.avatarUrl,
              isOnline: u.isOnline,
              lastSeen: u.lastSeen,
            })),
            admin: pop.admin ? pop.admin.toString() : null,
          };
        } catch (e) {
          // non-fatal; receivers can still fetch via REST
        }

        const outMsg = {
          id: message._id.toString(),
          chat: message.chat?.toString ? message.chat.toString() : String(message.chat),
          sender: message.sender?.toString ? message.sender.toString() : String(message.sender),
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
        chat.members.forEach((m) => {
          const target = m.toString();
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

function getIO() {
  if (!ioInstance) throw new Error("Socket.IO not initialized yet");
  return ioInstance;
}

module.exports = { initSocket, getIO, emitToUser };
