const express = require("express");
const router = express.Router();
const {
  getAdminNotifications,
  markNotificationSeen,
  resolveNotification,
  raiseWorkIssue
} = require("../controllers/admincontrooler");

// ✅ 1. Get all notifications (with optional status filter)
router.get("/notifications", getAdminNotifications);

// ✅ 2. Mark a notification as seen/unseen
router.patch("/notifications/:id/seen", markNotificationSeen);

// ✅ 3. Mark notification as resolved
router.patch("/notifications/:id/resolve", resolveNotification);

// ✅ 4. Technician raises issue (for test, can also use Postman)
router.post("/raise-issue", raiseWorkIssue);

module.exports = router;
