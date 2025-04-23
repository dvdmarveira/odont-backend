const nodemailer = require("nodemailer");
const logger = require("./logger");

const sendEmail = async (options) => {
  try {
    // 1) Criar um transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // 2) Definir as opções do email
    const mailOptions = {
      from: "OdontoLegal <noreply@odontolegal.com>",
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 3) Enviar o email
    await transporter.sendMail(mailOptions);
    logger.info(`Email enviado para ${options.email}`);
  } catch (error) {
    logger.error("Erro ao enviar email:", error);
    throw error;
  }
};

module.exports = sendEmail;
