const mongoose = require("mongoose");
const C = require("../../constants");

const ObjectId = mongoose.SchemaTypes.ObjectId;
const required = [true, C.FIELD_IS_REQ];

const MediaSchema = new mongoose.Schema(
  {
    url: String,
    mime: String,
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    chat: { type: ObjectId, ref: "Chat", required, index: true },
    sender: { type: ObjectId, ref: "User", required, index: true },
    content: { type: String, default: "" },
    media: [MediaSchema],
    status: { type: Map, of: String }, // userId -> 'sent'|'delivered'|'seen'
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

MessageSchema.index({ chat: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
