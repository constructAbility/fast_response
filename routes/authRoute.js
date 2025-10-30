const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const {
  registerClient,
  registerTechnician,
  login,
  verifyEmail,
  getProfile,
} = require("../controllers/authController");

const router = express.Router();

// Normal register/login
router.post("/client-register", registerClient);
router.post("/technician-register", registerTechnician);
router.post("/login", login);
router.post("/verify-otp", verifyEmail);

// Google Login (Client only)
router.get(
  "/google",
  (req, res, next) => {
    const role = req.query.role || "client";
    if (role !== "client") {
      return res.status(403).json({ message: "Google login allowed only for clients" });
    }
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  async (req, res) => {
    try {
      const googleUser = req.user;
      let user = await User.findOne({ email: googleUser.emails?.[0]?.value });

      if (!user) {
        user = await User.create({
          googleId: googleUser.id,
          firstName: googleUser.name?.givenName || "",
          lastName: googleUser.name?.familyName || "",
          email: googleUser.emails?.[0]?.value || "",
          avatar: googleUser.photos?.[0]?.value || "",
          role: "client",
        });
      } else {
        user.avatar = googleUser.photos?.[0]?.value || user.avatar;
        user.googleId = googleUser.id;
        await user.save();
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/client?token=${token}`);
    } catch (err) {
      console.error("Google Callback Error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Facebook Login (Client only)
router.get(
  "/facebook",
  (req, res, next) => {
    const role = req.query.role || "client";
    if (role !== "client") {
      return res.status(403).json({ message: "Facebook login allowed only for clients" });
    }
    next();
  },
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/auth/failure" }),
  async (req, res) => {
    try {
      const facebookUser = req.user;
      const token = jwt.sign(
        { id: facebookUser._id, role: facebookUser.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/client?token=${token}`);
    } catch (err) {
      console.error("Facebook Callback Error:", err);
      res.status(500).json({ message: "Server error during Facebook login" });
    }
  }
);

// Failure route
router.get("/failure", (req, res) => {
  res.status(401).json({ message: "❌ Authentication failed" });
});

module.exports = router;
