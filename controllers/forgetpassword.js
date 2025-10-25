const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../model/user");
const sendEmail = require("../utils/sendemail"); 

// ✅ 1. Forgot Password — Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Email is required" });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No account found with this email" });

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Save OTP and expiry (5 minutes)
    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    // Email content (HTML + text)
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hello ${user.firstName || user.name || "User"},</p>
      <p>Your One-Time Password (OTP) for resetting your password is:</p>
      <h3>${otp}</h3>
      <p>This OTP will expire in <b>5 minutes</b>.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>– One Step Solution Team</p>
    `;

    await sendEmail(user.email, "Password Reset OTP", html);

    res.status(200).json({
      message: "OTP sent successfully to your email.",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({
      message: "Server error during password reset.",
      error: err.message,
    });
  }
};

// ✅ 2. Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (!user.emailOTP || user.emailOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.emailOTPExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    // Optional: mark email verified
    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ 3. Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    if (!email || !otp || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (!user.emailOTP || user.emailOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.emailOTPExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    // Clear OTP fields
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
