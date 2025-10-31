const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../model/user");

// 🌍 Detect environment (backend URL)
const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

// ================== GOOGLE STRATEGY ==================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BASE_URL}/auth/google/callback`,
      scope: ["profile", "email"], // ✅ Ensure scope always present
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("✅ Google Profile:", profile.displayName, profile.emails?.[0]?.value);

        if (!profile.emails?.length) {
          return done(new Error("Google account does not provide email"), null);
        }

        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName || "",
            email: profile.emails[0].value,
            avatar: profile.photos?.[0]?.value || "",
            phone: "N/A",
            password: "google-oauth",
            role: "client",
            location: "N/A",
          });
        } else {
          user.googleId = profile.id;
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
        console.error("❌ Google Auth Error:", err);
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
            facebookId: profile.id,
            name: profile.displayName || "",
            email: profile.emails?.[0]?.value || `fb_${profile.id}@facebook.com`,
            avatar: profile.photos?.[0]?.value || "",
            phone: "N/A",
            password: "facebook-oauth",
            role: "client",
            location: "N/A",
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
        console.error("❌ Facebook Auth Error:", err);
        done(err, null);
      }
    }
  )
);

// ================== SESSION HANDLING ==================
passport.serializeUser((data, done) => {
  done(null, data);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

module.exports = passport;
