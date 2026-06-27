const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  googleLoginUser,
  getMe,
  updateMe,
  getUsers,
} = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLoginUser);
router.get("/me", authenticate, getMe);
router.get("/", authenticate, getUsers);
router.put("/me", authenticate, updateMe);

module.exports = router;
