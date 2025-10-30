const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendemail");

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const sendVerificationOTP = async (user, email, name) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailOTP = otp;
  user.emailOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  const html = `
    <div style="font-family:Arial; text-align:center;">
      <h2>Email Verification</h2>
      <p>Hello ${name || "User"},</p>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    </div>
  `;

  await sendEmail(email, "Your OTP Code", html);
};

/* ------------------------- CLIENT REGISTRATION -------------------------- */
exports.registerClient = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required." });

    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    let user = await User.findOne({ email });

    if (user && user.isEmailVerified)
      return res.status(400).json({ message: "Email already registered." });

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        phone,
        role: "client",
      });
    }

    // Remove technician-related fields
    user.set({
      specialization: undefined,
      experience: undefined,
      availability: undefined,
      onDuty: undefined,
      technicianStatus: undefined,
    });

    // Send OTP
    await sendVerificationOTP(user, email, firstName);
    res.status(200).json({
      message: "OTP sent to your email. Verify to complete registration.",
      email,
    });
  } catch (err) {
    console.error("Client registration error:", err);
    res.status(500).json({ message: "Registration failed. Try again later." });
  }
};

/* ------------------------- TECHNICIAN REGISTRATION -------------------------- */
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
      return res.status(400).json({ message: "Specialization and experience are required." });

    let user = await User.findOne({ email });
    if (user && user.isEmailVerified)
      return res.status(400).json({ message: "Email already registered as verified." });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user) {
      user = new User({
        firstName,
        lastName,
        email,
        phone,
        role: "technician",
        password: hashedPassword,
        specialization: Array.isArray(specialization)
          ? specialization
          : specialization.split(",").map((s) => s.trim().toLowerCase()),
        experience,
        location,
        availability: true,
        onDuty: false,
        technicianStatus: "available",
      });

      await user.save(); // ✅ important for deployment
    }

    await sendVerificationOTP(user, email, firstName);

    res.status(200).json({
      message: "Technician registration started. OTP sent to your email.",
      email,
    });
  } catch (err) {
    console.error("Technician registration error:", err);
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
