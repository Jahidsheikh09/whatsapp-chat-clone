const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL || process.env.POSTGRES_URI, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === "production" ? { require: true, rejectUnauthorized: false } : false,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log(`PostgreSQL Connected`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

module.exports = { sequelize, connectDB };
