const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false, // true for 465 (SSL), false for 587 (TLS)
  auth: {
    user: "apikey", // literal string for SendGrid
    pass: process.env.SENDGRID_PASS, // your actual SendGrid API Key
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"One Step Solution" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text: "Your email client does not support HTML messages.",
      html,
    });

    console.log("✅ Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error("Email sending failed.");
  }
};

module.exports = sendEmail;
