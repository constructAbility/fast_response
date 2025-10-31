const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../model/user");

// Detect environment
const BASE_URL =
  process.env.BACKEND_URL || "http://localhost:5000"; 
// Example: set BACKEND_URL=https://fast-response-5fjt.onrender.com in Render

// ================== GOOGLE STRATEGY ==================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("✅ Google Profile:", profile.displayName, profile.emails?.[0]?.value);

        let user = await User.findOne({ email: profile.emails?.[0]?.value });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            phone: "N/A",
            password: "google-oauth",
            role: "client",
            location: "N/A",
          });
        }

        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        done(null, { user, token });
      } catch (err) {
        console.error("Google Auth Error:", err);
        done(err, null);
      }
    }
  )
);

// ================== FACEBOOK STRATEGY ==================
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/facebook/callback`,
      profileFields: ["id", "displayName", "photos", "email", "name"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("✅ Facebook Profile:", profile.displayName, profile.emails?.[0]?.value);

        let user;
        if (profile.emails?.length) {
          user = await User.findOne({ email: profile.emails[0].value });
        } else {
          user = await User.findOne({ facebookId: profile.id });
        }

        if (!user) {
          user = await User.create({
            name: profile.displayName || "",
            email: profile.emails?.[0]?.value || `fb_${profile.id}@facebook.com`,
            phone: "N/A",
            password: "facebook-oauth",
            role: "client",
            location: "N/A",
            facebookId: profile.id,
            avatar: profile.photos?.[0]?.value || "",
          });
        } else {
          user.facebookId = profile.id;
          user.avatar = profile.photos?.[0]?.value || user.avatar;
          await user.save();
        }

        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        done(null, { user, token });
      } catch (err) {
        console.error("Facebook Auth Error:", err);
        done(err, null);
      }
    }
  )
);

// ================== SESSION HANDLING ==================
passport.serializeUser((data, done) => done(null, data));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
