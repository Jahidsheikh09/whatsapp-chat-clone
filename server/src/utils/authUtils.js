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

function isAllowedClientOrigin(origin) {
  if (!origin) return true;
  const urls = getClientUrls();
  if (urls.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".vercel.app")) return true;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
}

function getPrimaryClientUrl() {
  const urls = getClientUrls();
  return urls[0] || "http://localhost:5173";
}

function resolveClientUrl(preferred) {
  if (preferred) {
    try {
      const origin = new URL(preferred).origin;
      if (isAllowedClientOrigin(origin)) return origin;
    } catch {
      // ignore invalid URL
    }
  }
  return getPrimaryClientUrl();
}

module.exports = {
  generateToken,
  mapUser,
  getPrimaryClientUrl,
  getClientUrls,
  isAllowedClientOrigin,
  resolveClientUrl,
};
