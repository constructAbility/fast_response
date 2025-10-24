const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const { register, login } = require("../controllers/authController");

const router = express.Router();

// 🧩 Normal Register/Login (for all roles)
router.post("/register", register);
router.post("/login", login);

// 🧩 Google Login (only for clients)
router.get(
  "/google",
  (req, res, next) => {
    // Add query param ?role=client to control who can login
    const role = req.query.role || "client";
    if (role !== "client") {
      return res.status(403).json({ message: "❌ Google login allowed only for clients" });
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// 🧩 Google Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  async (req, res) => {
    try {
      const googleUser = req.user;

      // 🧠 Force role = client
      let user = await User.findOne({ email: googleUser.email });
      if (!user) {
        user = new User({
          name: googleUser.name,
          email: googleUser.email,
          phone: "N/A",
          password: "N/A",
          role: "client", // ✅ Force role as client
          location: "N/A"
        });
        await user.save();
      } else if (user.role !== "client") {
        return res.status(403).json({
          message: "❌ Only clients can use Google login",
        });
      }

      // 🔑 Generate JWT
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        message: "✅ Google login success (client)",
        token,
        user,
      });
    } catch (err) {
      console.error("Google Callback Error:", err);
      res.status(500).json({ message: "Server error during Google login" });
    }
  }
);

// 🧩 Failure redirect
router.get("/failure", (req, res) => {
  res.status(401).json({ message: "❌ Google authentication failed" });
});

// 🧩 Email-Only Login Flow (client only)
router.post("/email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    let user = await User.findOne({ email });
    if (!user) {
      // 🧠 Automatically register as client
      user = new User({
        name: "New Client",
        email,
        phone: "N/A",
        password: "N/A",
        role: "client", // ✅hh Force client
        location: "N/A"
      });
      await user.save();
    } else if (user.role !== "client") {
      return res.status(403).json({
        message: "❌ Only clients can use email login",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "✅ Email login successful (client)",
      token,
      user,
    });
  } catch (err) {
    console.error("Email Login Error:", err);
    res.status(500).json({ message: "Server error during email login" });
  }
});

module.exports = router;
