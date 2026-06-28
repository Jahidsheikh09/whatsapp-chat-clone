const { Sequelize } = require("sequelize");

function sanitizeDatabaseUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return url;
  }
}

const databaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL || process.env.POSTGRES_URI);
const useSsl = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

const connectDB = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log("PostgreSQL Connected");
};

module.exports = { sequelize, connectDB };
