const nodemailer = require("nodemailer");

/**
 * Send a generic email via SMTP
 */
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(message);
  console.log("Message sent: %s", info.messageId);
};

/**
 * Send a contact form email via Office 365 SMTP
 */
const sendContactFormMail = async (info) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.CONTACT_FORM_EMAIL,
      pass: process.env.CONTACT_FORM_PASS,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: "onlinebanking@accessbankliberia.com",
    to: "info@accessbankliberia.com",
    subject: info.subject,
    text: `
      Name: ${info.fullName}
      Email: ${info.email}
      Phone: ${info.phone || "Not provided"}
      Subject: ${info.subject}
      Message: ${info.message}
    `,
    html: info.htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = sendEmail;
module.exports.sendContactFormMail = sendContactFormMail;
