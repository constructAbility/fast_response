const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

/* ---------------------- TOKEN GENERATION ---------------------- */
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/* ---------------------- OTP EMAIL FUNCTION ---------------------- */
const sendVerificationOTP = async (user, email, name) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailOTP = otp;
    user.emailOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const html = `
      <div style="font-family:Arial, text-align:center; background:#f9f9f9; padding:20px; border-radius:8px;">
        <h2 style="color:#333;">Email Verification</h2>
        <p>Hello <strong>${name || "User"}</strong>,</p>
        <p>Your OTP for email verification is:</p>
        <h1 style="background:#007bff; color:white; display:inline-block; padding:10px 20px; border-radius:6px;">${otp}</h1>
        <p>This code will expire in <b>10 minutes</b>.</p>
        <hr/>
        <small style="color:#888;">© One Step Solution</small>
      </div>
    `;

    await sendEmail(email, "Your OTP Code - One Step Solution", html);
    console.log(`✅ OTP ${otp} sent to ${email}`);
  } catch (err) {
    console.error("❌ Error sending OTP email:", err.message);
    throw new Error("Failed to send OTP email. Please try again later.");
  }
};

/* ---------------------- CLIENT REGISTRATION ---------------------- */
exports.registerClient = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required." });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    let user = await User.findOne({ email });

    // If already verified
    if (user && user.isEmailVerified) {
      return res.status(400).json({ message: "Email already registered and verified." });
    }

    // Hash password if new or updating
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        phone,
        role: "client",
        password: hashedPassword,
      });
    } else {
      // Update existing unverified record
      user.set({
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        role: "client",
      });
    }

    // Clear technician fields if exist
    user.specialization = undefined;
    user.experience = undefined;
    user.availability = undefined;
    user.onDuty = undefined;
    user.technicianStatus = undefined;

    await sendVerificationOTP(user, email, firstName);

    res.status(200).json({
      message: "OTP sent to your email. Verify to complete registration.",
      email,
    });
  } catch (err) {
    console.error("❌ Client registration error:", err.message);
    res.status(500).json({ message: "Registration failed. Try again later." });
  }
};

/* ---------------------- TECHNICIAN REGISTRATION ---------------------- */
exports.registerTechnician = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      confirmPassword,
      specialization,
      experience,
      location,
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required." });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    if (!specialization || !experience)
      return res
        .status(400)
        .json({ message: "Specialization and experience are required." });

    let user = await User.findOne({ email });

    if (user && user.isEmailVerified)
      return res.status(400).json({ message: "Email already registered and verified." });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: "technician",
        specialization: Array.isArray(specialization)
          ? specialization.map((s) => s.trim().toLowerCase())
          : specialization.split(",").map((s) => s.trim().toLowerCase()),
        experience,
        location,
        availability: true,
        onDuty: false,
        technicianStatus: "available",
      });
    } else {
      // Update existing unverified user
      user.set({
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        specialization: Array.isArray(specialization)
          ? specialization.map((s) => s.trim().toLowerCase())
          : specialization.split(",").map((s) => s.trim().toLowerCase()),
        experience,
        location,
        availability: true,
        onDuty: false,
        technicianStatus: "available",
        role: "technician",
      });
    }

    await sendVerificationOTP(user, email, firstName);

    res.status(200).json({
      message: "Technician registration started. OTP sent to your email.",
      email,
    });
  } catch (err) {
    console.error("❌ Technician registration error:", err.message);
    res.status(500).json({ message: "Registration failed. Try again later." });
  }
};

/* ------------------------- EMAIL VERIFICATION -------------------------- */
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "No user found with this email." });

    if (!user.emailOTP || !user.emailOTPExpires)
      return res.status(400).json({ message: "No OTP request found. Please request a new OTP." });

    if (Date.now() > user.emailOTPExpires)
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });

    if (user.emailOTP !== otp)
      return res.status(400).json({ message: "Invalid OTP." });

    user.isEmailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ message: "Server error during verification." });
  }
};

/* ------------------------- LOGIN -------------------------- */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials." });

    if (!user.password)
      return res.status(400).json({
        message: "This account was created via Google/Facebook or OTP login. Please use that method.",
      });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials." });

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

/* ------------------------- PROFILE -------------------------- */
exports.getProfile = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    console.error("Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
