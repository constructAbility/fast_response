const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey", 
    pass: process.env.SENDGRID_PASS, 
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"One Step Solution" <backendoffice12@gmail.com>`, 
      to,
      subject,
      text: "Hello, this is a test email from SendGrid using Node.js.", 
      html,
    });
    console.log("✅ Email sent:", info.messageId);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
  }
};

module.exports = sendEmail;
