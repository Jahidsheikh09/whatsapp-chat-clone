const express = require("express");
const passport = require("passport");
const dotenv = require("dotenv").config();
const color = require("colors");
const http = require("http");
const fs = require("fs");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db.js");
require("./models");
const { initSocket } = require("./sockets/index.js");
const { errorHandler } = require("./middleware/errorMiddleware.js");
const { authenticate } = require("./middleware/authMiddleware.js");
const { configurePassport } = require("./config/passport.js");
const path = require("path");

connectDB().catch((error) => {
  console.error("Database startup failed:", error.message);
});

configurePassport();

const PORT = process.env.PORT || 5000;

function getClientUrls() {
  const fromEnv = (process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.VERCEL_URL) {
    fromEnv.push(`https://${process.env.VERCEL_URL}`);
  }
  return [...new Set(fromEnv)];
}

const CLIENT_URLS = getClientUrls();

function createApp() {
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
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
          frameSrc: ["'self'", "https://accounts.google.com"],
          connectSrc: ["'self'", "https://accounts.google.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        },
      },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
  app.use(passport.initialize());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", require("./routes/authRoutes.js"));
  app.use("/api/users", require("./routes/userRoutes.js"));
  app.use("/api/chats", authenticate, require("./routes/chatRoutes.js"));

  const distPath = path.resolve(__dirname, "../dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}

const app = createApp();

if (process.env.VERCEL) {
  module.exports = app;
} else if (require.main === module) {
  const server = http.createServer(app);
  initSocket(server, CLIENT_URLS);
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  module.exports = server;
} else {
  module.exports = app;
}
