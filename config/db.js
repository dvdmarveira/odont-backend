const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    logger.error("Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB desconectado, tentando reconectar...");
  setTimeout(connectDB, 2000);
});

module.exports = connectDB;
