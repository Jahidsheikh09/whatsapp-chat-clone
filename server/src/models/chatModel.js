const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Chat = sequelize.define(
  "Chat",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    isGroup: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    name: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    avatarUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    adminId: { type: DataTypes.UUID, allowNull: true },
    lastMessageId: { type: DataTypes.UUID, allowNull: true },
  },
  { timestamps: true, tableName: "chats" }
);

module.exports = Chat;
