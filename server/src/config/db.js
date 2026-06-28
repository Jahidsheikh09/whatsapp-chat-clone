const { Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URI;
const useSsl = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: useSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
});

const connectDB = async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log("PostgreSQL Connected");
};

module.exports = { sequelize, connectDB };
// const { Sequelize } = require("sequelize");

// const databaseUrl =
//   process.env.DATABASE_URL || process.env.POSTGRES_URI;

// const sequelize = new Sequelize(databaseUrl, {
//   dialect: "postgres",
//   logging: false,
//   dialectOptions: {
//     ssl: {
//       require: true,
//       rejectUnauthorized: false,
//     },
//   },
// });

// const connectDB = async () => {
//   await sequelize.authenticate();
//   console.log("✅ PostgreSQL Connected");

//   await sequelize.sync();
// };

// module.exports = {
//   sequelize,
//   connectDB,
// };