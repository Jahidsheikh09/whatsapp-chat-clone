const jwt = require("jsonwebtoken");

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
}

function mapUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
  };
}

function getPrimaryClientUrl() {
  const urls = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (process.env.VERCEL_URL) {
    urls.unshift(`https://${process.env.VERCEL_URL}`);
  }
  return urls[0] || "http://localhost:5173";
}

module.exports = { generateToken, mapUser, getPrimaryClientUrl };
