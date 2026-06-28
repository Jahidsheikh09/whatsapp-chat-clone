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

let dbConnected = false;

// Start database connection asynchronously without blocking server startup
connectDB()
  .then(() => {
    dbConnected = true;
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
    console.error("Server will continue running, but database operations will fail");
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
  // app.use(
  //   cors({
  //     origin(origin, callback) {
  //       if (isAllowedClientOrigin(origin)) return callback(null, true);
  //       callback(new Error("Not allowed by CORS"), false);
  //     },
  //     credentials: true,
  //   }),
  // );

  const corsOptions = {
    origin: function (origin, callback) {
      console.log("Origin:", origin);

      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedClientOrigin(origin)) {
        return callback(null, true);
      }

      console.log("Blocked:", origin);

      return callback(new Error(`CORS Blocked: ${origin}`));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  };

  app.use(cors(corsOptions));

  app.options("*", cors(corsOptions));

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
          // connectSrc: ["'self'", "https://accounts.google.com"],
          connectSrc: [
            "'self'",
            process.env.CLIENT_URL,
            "https://accounts.google.com",
            "https://whatsapp-chat-clone-production.up.railway.app",
          ],
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

  // Health check endpoints (no database required)
  app.get("/health", (req, res) => {
    res.json({ 
      status: "ok",
      database: dbConnected ? "connected" : "connecting" 
    });
  });

  app.get("/health/live", (req, res) => {
    res.json({ status: "alive" });
  });

  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      service: "WhatsApp Chat Clone API",
      health: "/health",
    });
  });

  // Middleware to check database connection for API routes
  app.use("/api/", (req, res, next) => {
    if (!dbConnected) {
      return res.status(503).json({ 
        error: "Service temporarily unavailable",
        message: "Database is still connecting. Please try again shortly." 
      });
    }
    next();
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

// Global error handlers to prevent silent crashes
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise, "reason:", reason);
});

if (process.env.VERCEL) {
  module.exports = app;
} else if (require.main === module) {
  const server = http.createServer(app);
  
  try {
    console.log("Initializing Socket.IO...");
    initSocket(server);
    console.log("Socket.IO initialized successfully");
  } catch (error) {
    console.error("Socket.IO initialization error:", error.message);
    console.error(error.stack);
  }
  
  server.on("error", (error) => {
    console.error("Server error:", error.message);
    console.error(error.stack);
  });
  
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
  
  module.exports = server;
} else {
  module.exports = app;
}
