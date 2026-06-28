const express = require("express");
const passport = require("passport");
const { generateToken, getPrimaryClientUrl, resolveClientUrl } = require("../utils/authUtils");

const router = express.Router();

const googleConfigured =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

const oauthCookieOptions = {
  httpOnly: true,
  maxAge: 10 * 60 * 1000,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

router.get("/google-config", (req, res) => {
  if (!googleConfigured) {
    return res.status(503).json({ message: "Google OAuth is not configured on the server" });
  }
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID,
    authUrl: "/api/auth/google",
  });
});

router.get("/google", (req, res, next) => {
  if (!googleConfigured) {
    return res.status(503).json({ message: "Google OAuth is not configured on the server" });
  }

  if (req.query.returnTo) {
    const clientUrl = resolveClientUrl(req.query.returnTo);
    res.cookie("oauth_return_to", clientUrl, oauthCookieOptions);
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!googleConfigured) {
      const clientUrl = getPrimaryClientUrl();
      return res.redirect(`${clientUrl}/?error=google_not_configured`);
    }
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${resolveClientUrl(req.cookies?.oauth_return_to)}/?error=google_auth_failed`,
    })(req, res, next);
  },
  (req, res) => {
    const token = generateToken(req.user.id);
    const clientUrl = resolveClientUrl(req.cookies?.oauth_return_to);
    res.clearCookie("oauth_return_to");
    res.redirect(`${clientUrl}/?token=${encodeURIComponent(token)}`);
  }
);

module.exports = router;
