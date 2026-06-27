const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { notEmpty: true } },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    avatarUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    lastSeen: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    isOnline: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    provider: { type: DataTypes.STRING, allowNull: false, defaultValue: "local" },
    googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
  },
  { timestamps: true, tableName: "users" }
);

module.exports = User;
