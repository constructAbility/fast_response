const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendemail");
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, ...rest } = req.body;

    // ✅ Required fields check
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // ✅ Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Please request an OTP first" });
    }

    // ✅ Check if email verified via OTP
    if (!user.isEmailVerified) {
      return res.status(400).json({ message: "Please verify your email first" });
    }

    // ✅ Check if user already registered (name & password set)
    if (user.password) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Update user with full details
    user.name = name;
    user.phone = phone;
    user.password = hashed;
    user.role = role;
    Object.assign(user, rest); // any extra fields
    await user.save();

    // ✅ Generate JWT
    const token = generateToken(user);

    res.status(201).json({
      message: "Registered successfully",
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Registration failed, no data saved" });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({ message: "Login successful", token, user: user.toJSON() });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    console.error("Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

