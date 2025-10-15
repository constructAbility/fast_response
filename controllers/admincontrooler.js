const mongoose= require('mongoose')
const Work = require("../model/work");
const User = require("../model/user");
const Booking=require("../model/BookOrder")
const axios = require("axios");
const AdminNotification=require('../model/adminnotification')
exports.getAdminNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find()
      .sort({ createdAt: -1 })
      .populate("work", "serviceType status location")
      .populate("technician", "name email phone");

    if (!notifications.length) {
      return res.status(200).json({ message: "No notifications found", notifications: [] });
    }

    res.status(200).json({
      message: "Admin notifications fetched successfully",
      count: notifications.length,
      notifications
    });
  } catch (err) {
    console.error("Get Admin Notifications Error:", err.message);
    res.status(500).json({ message: "Server error while fetching notifications" });
  }
};


