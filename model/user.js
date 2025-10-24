const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // 🔹 Common fields
  name: String,
  email: { type: String, unique: true, sparse: true },
  phone: String,
  password: String,
  role: { type: String, enum: ["client", "technician", "admin"], default: "client" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // 🔹 Social login fields
  googleId: String,
  facebookId: String,
  avatar: String,

  // 🔹 Common location fields
  location: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
  lastLocationUpdate: Date,

  // 🔹 Client-specific
  companyName: String,
  address: String,
  gstNumber: String,

  // 🔹 Technician-specific
  experience: Number,
  specialization: [String],
  responsibility: String,
  employeeId: String,
  availability: { type: Boolean, default: true },
  onDuty: { type: Boolean, default: false },
  ratings: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  technicianStatus: {
    type: String,
    enum: ["available", "dispatched", "working", "break", "offDuty"],
    default: "available",
  },

  // 🔹 Admin-specific
  department: String,
  permissions: [String],
});

module.exports = mongoose.model("User", userSchema);
