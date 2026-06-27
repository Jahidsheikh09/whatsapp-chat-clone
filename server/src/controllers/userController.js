const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { Op } = require("sequelize");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/userModel");
const { findOrCreateGoogleUser } = require("../services/googleUserService");
const { generateToken, mapUser } = require("../utils/authUtils");

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

//@desc    Register New User
//@route   POST /api/users/register
//@access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, name } = req.body;

  const userExists = await User.findOne({
    where: {
      [Op.or]: [{ email }, { username }],
    },
  });

  if (userExists) {
    res.status(400);
    throw new Error("User Already Exists");
  }

  const salt = await bcrypt.genSalt(8);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    username,
    password: hashedPassword,
    provider: "local",
  });

  if (user) {
    res.status(201).json({
      message: "User Register Successfully",
      user: mapUser(user),
      token: generateToken(user.id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid User Data");
  }
});

//@desc    Authenticate a User
//@route   POST /api/users/login
//@access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide either email or password");
  }

  const user = await User.findOne({ where: { email } });

  if (user && !user.password && user.provider === "google") {
    res.status(400);
    throw new Error("This account uses Google sign-in. Please use the Google button.");
  }

  if (user && user.password && (await bcrypt.compare(password, user.password))) {
    res.json({
      message: "Login User Successfully",
      user: mapUser(user),
      token: generateToken(user.id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid Credentials");
  }
});

//@desc    Authenticate a User with Google (One Tap / GIS token)
//@route   POST /api/users/google
//@access  Public
const googleLoginUser = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error("Google credential is required");
  }

  if (!googleClient) {
    res.status(500);
    throw new Error("Google authentication is not configured");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  const user = await findOrCreateGoogleUser({
    id: payload.sub,
    displayName: payload.name,
    emails: [{ value: payload.email }],
    photos: [{ value: payload.picture }],
  });

  res.json({
    message: "Login User Successfully",
    user: mapUser(user),
    token: generateToken(user.id),
  });
});

//@desc    Get User Data
//@route   GET /api/users/me
//@access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ["password"] },
  });

  res.status(200).json(mapUser(user));
});

//@desc    Put User Data
//@route   PUT /api/users/me
//@access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;
  await User.update({ name, avatarUrl }, { where: { id: req.user.id } });
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ["password"] },
  });
  res.json(mapUser(user));
});

//@desc    Get User Data
//@route   GET /api/users/
//@access  Private
const getUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").toString();
  const users = await User.findAll({
    where: {
      [Op.or]: [
        { username: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
      ],
    },
    attributes: { exclude: ["password"] },
    limit: 20,
  });
  res.json(users.map(mapUser));
});

module.exports = {
  registerUser,
  loginUser,
  googleLoginUser,
  getMe,
  updateMe,
  getUsers,
};
