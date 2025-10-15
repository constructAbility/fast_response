const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ["work_issue"], required: true },
  message: { type: String, required: true },
  work: { type: mongoose.Schema.Types.ObjectId, ref: "Work" },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  issueType: { type: String },
  remarks: String,
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
