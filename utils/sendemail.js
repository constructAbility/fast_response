const sgMail = require("@sendgrid/mail");
require("dotenv").config();

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable is missing");
}
if (!process.env.EMAIL_FROM) {
  throw new Error("EMAIL_FROM environment variable is missing");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, html) => {
  if (!to) throw new Error("Recipient email is required");
  if (!subject) throw new Error("Email subject is required");
  if (!html) throw new Error("Email HTML content is required");

  const msg = {
    to,
    from: {
      name: "One Step Solution",
      email: process.env.EMAIL_FROM,
    },
    subject,
    html,
  };

  try {
    const response = await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
    return response;
  } catch (error) {
    console.error("❌ Failed to send email:", error.response?.body || error.message);
    throw error;
  }
};

module.exports = sendEmail;
