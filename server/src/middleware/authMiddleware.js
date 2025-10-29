const jwt = require("jsonwebtoken");
const requestIP = require("request-ip");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

const authenticate = asyncHandler(async (req, res, next) => {
  const cliendIP = requestIP.getClientIp(req);

  let logData = `${cliendIP} ${req.headers["user-agent"]} ${req.originalUrl}`;

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  let decode;
  try {
    decode = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.log(err);
    res.status(401);
    throw new Error("Not Authorized!");
  }

  req.user = await User.findById(decode.id)
    .select("-password")
    .lean();
  
  req.user.id = req.user._id.toString();

  if (!req.user) {
    res.status(404);
    throw new Error("Invalid Token!");
  }

  logData += ` ${req.user.email}`;

  // UC.writeLog("op_logs", logData);
  next();
});

const protect = asyncHandler(async (req, res, next) => {
  let token;
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      // Get token form Headers
      token = req.headers.authorization.split(" ")[1];
      // Verify Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(401);
    throw new Error("Not Authorized");
  }
  if (!token) {
    res.status(401);
    throw new Error("Not Authorized, no token");
  }
});

function signJwt(payload, opts = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h", ...opts });
}

module.exports = { authenticate, protect, signJwt };
