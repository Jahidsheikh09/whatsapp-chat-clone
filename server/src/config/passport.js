const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");
const { findOrCreateGoogleUser } = require("../services/googleUserService");

function configurePassport() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("Google OAuth: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
    return passport;
  }

  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateGoogleUser(profile);
          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  return passport;
}

module.exports = { configurePassport };
