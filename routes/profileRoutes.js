const express = require("express");
const { updateProfile } = require("../controllers/profile");
const { protect, authorize } = require("../middleware/authMiddleware");
const User=require('../model/user')
const router = express.Router();

// Normal users can update their profile
router.put("/update", protect, updateProfile);

// Only admin can see all users
router.get("/all", protect, authorize("admin"), async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

module.exports = router;
