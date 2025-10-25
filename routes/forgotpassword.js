const express = require("express");
const router = express.Router();

const {
  forgotPassword,
  verifyOTP,
  resetPassword,
} = require("../controllers/forgetpassword");

// 🔹 Route: Send OTP to user email for password reset
router.post("/forgot-password", forgotPassword);

// 🔹 Route: Verify the OTP sent to email
router.post("/verify-otp", verifyOTP);

// 🔹 Route: Reset password after OTP verification
router.post("/reset-password", resetPassword);

module.exports = router;
