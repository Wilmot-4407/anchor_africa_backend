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
 * Send a contact form email via Hostinger SMTP
 */
const sendContactFormMail = async (info) => {
  const transporter = nodemailer.createTransport({
    host: process.env.CONTACT_SMTP_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.CONTACT_SMTP_PORT || "465", 10),
    secure: true, // port 465 uses SSL
    auth: {
      user: process.env.CONTACT_FORM_EMAIL,
      pass: process.env.CONTACT_FORM_PASS,
    },
  });

  const mailOptions = {
    from: process.env.CONTACT_FROM_EMAIL || process.env.CONTACT_FORM_EMAIL,
    to: process.env.CONTACT_TO_EMAIL,
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
