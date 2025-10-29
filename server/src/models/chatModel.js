const mongoose = require("mongoose");
const C = require("../../constants");

const ObjectId = mongoose.SchemaTypes.ObjectId;
const required = [true, C.FIELD_IS_REQ];

const ChatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    members: [{ type: ObjectId, ref: "User", index: true }],
    admin: { type: ObjectId, ref: "User" },
    lastMessage: { type: ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", ChatSchema);
module.exports = Chat;
