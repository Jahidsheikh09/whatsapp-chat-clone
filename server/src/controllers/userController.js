const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

//@desc    Register New User
//@route   POST /api/users/register
//@access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, name } = req.body;

  // Check if User Exists
  const userExists = await User.findOne({ $or: [{ email }, { username }] });

  if (userExists) {
    res.status(400);
    throw new Error("User Already Exists");
  }

  //Hash Password
  const salt = await bcrypt.genSalt(8);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create User
  const user = await User.create({
    name,
    email,
    username,
    password: hashedPassword,
  });

  if (user) {
    res.status(201).json({
      message: "User Register Successfully",
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      token: generateToken(user._id),
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

  // Find user by either email
  const user = await User.findOne({ email: email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      message: "Login User Successfully",
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid Credentials");
  }
});

//@desc    Get User Data
//@route   GET /api/users/me
//@access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
});

//@desc    Put User Data
//@route   PUT /api/users/me
//@access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, avatarUrl } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, avatarUrl },
    { new: true }
  );
  res.json({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
});

//@desc    Get User Data
//@route   GET /api/users/
//@access  Private
const getUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").toString();
  const users = await User.find({
    $or: [{ username: new RegExp(q, "i") }, { email: new RegExp(q, "i") }],
  }).limit(20);
  res.json(
    users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
    }))
  );
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  getUsers,
};
