const { sequelize } = require('../config/db');
const User = require('./userModel');
const Chat = require('./chatModel');
const Message = require('./messageModel');

User.hasMany(Chat, { foreignKey: 'adminId', as: 'administeredChats' });
Chat.belongsTo(User, { foreignKey: 'adminId', as: 'adminUser' });

User.belongsToMany(Chat, { through: 'ChatMembers', as: 'chats' });
Chat.belongsToMany(User, { through: 'ChatMembers', as: 'members' });

Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

Chat.belongsTo(Message, { foreignKey: 'lastMessageId', as: 'lastMessage' });

module.exports = {
  sequelize,
  User,
  Chat,
  Message,
};
