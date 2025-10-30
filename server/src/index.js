const express = require("express");
const dotenv = require("dotenv").config();
const color = require("colors");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db.js");
const { initSocket } = require("./sockets/index.js");
const { errorHandler } = require("./middleware/errorMiddleware.js");
const { authenticate } = require("./middleware/authMiddleware.js");
const path = require("path");

connectDB();

const PORT = process.env.PORT || 5000;
// Support both common Vite ports by default; can be overridden via CLIENT_URL
const CLIENT_URLS = (
  process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const ok = CLIENT_URLS.includes(origin);
      callback(ok ? null : new Error("Not allowed by CORS"), ok);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/users", require("./routes/userRoutes.js"));
app.use("/api/chats", authenticate, require("./routes/chatRoutes.js"));

app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "dist", "index.html")));

const server = http.createServer(app);

initSocket(server, CLIENT_URLS);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
