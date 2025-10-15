const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  // 🔹 Common fields
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["client", "technician", "admin"], required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },

  // 🔹 Common location fields
  location: { type: String, required: true },

  // ✅ For live tracking (GeoJSON)
  coordinates: {
    lat: { type: Number },   // current latitude
    lng: { type: Number }    // current longitude
  },
  lastLocationUpdate: { type: Date }, // when last updated

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
  onDuty: { type: Boolean, default: false }, // ✅ true when on a job/traveling
  ratings: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
technicianStatus: {
  type: String,
  enum: ["available", "dispatched", "working", "break", "offDuty"],
  default: "available"
},

  // 🔹 Admin-specific
  department: String,
  permissions: [String]
});

module.exports = mongoose.model("User", userSchema);
