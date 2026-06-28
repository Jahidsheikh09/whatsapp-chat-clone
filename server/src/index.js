const express = require("express");
const passport = require("passport");
const dotenv = require("dotenv").config();
const color = require("colors");
const http = require("http");
const fs = require("fs");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db.js");
require("./models");
const { initSocket } = require("./sockets/index.js");
const { errorHandler } = require("./middleware/errorMiddleware.js");
const { authenticate } = require("./middleware/authMiddleware.js");
const { configurePassport } = require("./config/passport.js");
const { isAllowedClientOrigin } = require("./utils/authUtils.js");
const path = require("path");

connectDB().catch((error) => {
  console.error("Database startup failed:", error.message);
  process.exit(1);
});

configurePassport();

const PORT = process.env.PORT || 5000;

console.log("Starting backend server...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
console.log("JWT_SECRET set:", !!process.env.JWT_SECRET);
console.log(
  "CLIENT_URL:",
  process.env.CLIENT_URL ||
    "(not set — CORS allows localhost and *.vercel.app)",
);

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is required in production");
  process.exit(1);
}

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedClientOrigin(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"), false);
      },
      credentials: true,
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://accounts.google.com",
          ],
          frameSrc: ["'self'", "https://accounts.google.com"],
          connectSrc: ["'self'", "https://accounts.google.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://accounts.google.com",
          ],
        },
      },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan("dev"));
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
  app.use(passport.initialize());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      service: "WhatsApp Chat Clone API",
      health: "/health",
    });
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

  app.use((req, res) => {
    res
      .status(404)
      .json({ message: `Route not found: ${req.method} ${req.path}` });
  });

  app.use(errorHandler);
  return app;
}

const app = createApp();

if (process.env.VERCEL) {
  module.exports = app;
} else if (require.main === module) {
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
  module.exports = server;
} else {
  module.exports = app;
}
