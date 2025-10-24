const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../model/user");
const jwt = require("jsonwebtoken");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://fast-response-5fjt.onrender.com/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          // Create new user if doesn't exist
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            phone: "N/A",
            password: "google-oauth",
            role: "client",
            location: "N/A",
          });
        }

        // Generate JWT token
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

// Session handling (for passport)
passport.serializeUser((data, done) => done(null, data));
passport.deserializeUser((obj, done) => done(null, obj));

module.exports = passport;
