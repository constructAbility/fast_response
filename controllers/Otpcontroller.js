const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Temporary store (better use Redis or DB)
const otpStore = {};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email required" });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with expiry (5 mins)
    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    // Setup mail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER, // your gmail id
        pass: process.env.SMTP_PASS, // your gmail app password
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'OTP sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

exports.verifyOTP = (req, res) => {
  const { email, otp } = req.body;

  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: 'OTP not found' });

  if (Date.now() > record.expiresAt)
    return res.status(400).json({ message: 'OTP expired' });

  if (record.otp !== otp)
    return res.status(400).json({ message: 'Invalid OTP' });

  delete otpStore[email]; // OTP used
  res.status(200).json({ message: 'OTP verified successfully!' });
};
