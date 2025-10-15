const mongoose = require("mongoose");

const workSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceType: { type: String, required: true },
  specialization: [String],
  description: String,
  location: String,

  assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },

  token: { type: String },

  // 🧩 Enhanced status to support incomplete service scenarios
  status: {
    type: String,
    enum: [
      "open",          // default new work
      "taken",         // technician assigned
      "approved",      // supervisor approved
      "dispatch",      // technician en route
      "inprogress",    // technician started
      "completed",     // work done
      "confirm",       // awaiting client confirmation
      "onhold_parts",  // waiting for parts
      "escalated",     // need specialist/supervisor
      "rescheduled"    // customer unavailable
    ],
    default: "open"
  },

  // 🧩 New fields for issue tracking
  issueType: {
    type: String,
    enum: ["need_parts", "need_specialist", "customer_unavailable", null],
    default: null
  },

  remarks: { type: String, trim: true },  // technician remarks or reason

  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },

  // optional for tracking issue updates or follow-ups
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update `updatedAt` timestamp on save
workSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Work", workSchema);
