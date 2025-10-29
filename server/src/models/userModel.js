const mongoose = require("mongoose");
const C = require("../../constants");
const required = [true, C.FIELD_IS_REQ];

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required, unique: true, index: true, trim: true },
    email: {
      type: String,
      required,
      unique: true,
      index: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long"],
    },
    name: { type: String, default: "", trim: true },
    avatarUrl: { type: String, default: "" },
    lastSeen: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
