const { Op } = require("sequelize");
const User = require("../models/userModel");

async function findOrCreateGoogleUser(profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value;
  const name = profile.displayName || email;
  const avatarUrl = profile.photos?.[0]?.value || "";

  if (!email) {
    throw new Error("Google account email is required");
  }

  let user = await User.findOne({
    where: {
      [Op.or]: [{ email }, { googleId }],
    },
  });

  if (!user) {
    const baseUsername =
      email
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "") || "google-user";
    let username = baseUsername;
    let suffix = 1;

    while (await User.findOne({ where: { username } })) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    user = await User.create({
      username,
      email,
      name,
      avatarUrl,
      provider: "google",
      googleId,
      password: null,
    });
  } else if (!user.googleId || user.provider !== "google") {
    await user.update({
      provider: "google",
      googleId,
      name: name || user.name || email,
      avatarUrl: avatarUrl || user.avatarUrl || "",
    });
  }

  return user;
}

module.exports = { findOrCreateGoogleUser };
