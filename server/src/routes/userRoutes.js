const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  getUsers,
} = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", authenticate, getMe);
router.get("/", authenticate, getUsers);
router.put("/me", authenticate, updateMe);

module.exports = router;
