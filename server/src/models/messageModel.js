const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Message = sequelize.define(
  "Message",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    chatId: { type: DataTypes.UUID, allowNull: false },
    senderId: { type: DataTypes.UUID, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
    media: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    status: { type: DataTypes.JSON, allowNull: true, defaultValue: {} },
  },
  { timestamps: true, tableName: "messages" }
);

module.exports = Message;
