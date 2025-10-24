// models/work.js
const mongoose = require("mongoose");

const workSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  serviceType: { type: String, required: true },
  specialization: [String],
  description: String,
  location: String,

  assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  coordinates: {
    lat: Number,
    lng: Number
  },

  token: String,

  status: {
    type: String,
    enum: [
      "open",
      "taken",
      "approved",
      "dispatch",
      "inprogress",
      "completed",
      "confirm",
      "onhold_parts",
      "escalated",
      "rescheduled"
    ],
    default: "open"
  },

  issueType: {
    type: String,
    enum: ["need_parts", "need_specialist", "customer_unavailable", null],
    default: null
  },

  remarks: { type: String, trim: true },
  adminNotification: { type: mongoose.Schema.Types.ObjectId, ref: "AdminNotification" },

  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  completedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

workSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Work", workSchema);
