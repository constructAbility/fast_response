const express = require('express');
const { protect, authorize } = require('../middelware/authMiddelware');
const router = express.Router();

const { 
  createWork, 
  findMatchingTechnicians, 
  bookTechnician, 
  WorkStart,
  WorkComplete,
  trackTechnician,
  updateLocation,getClientWorkStatus,reportWorkIssue,getAdminNotifications
} = require('../controllers/workController');

const { getAllWorks } = require('../controllers/statuscontrollers');

// 🧩 Create new work
router.post('/work/create', protect, createWork);

// 🧩 Find matching technicians
router.post('/work/find-technicians', protect, findMatchingTechnicians);

// 🧩 Book a technician for a work
router.post('/work/book-technician', protect, bookTechnician);

// 🧩 Technician starts the work
router.post('/work/start', protect, authorize('technician'), WorkStart);

// 🧩 Technician completes the work
router.post('/work/complete', protect, authorize('technician'), WorkComplete);
router.post('/work/issue', protect, authorize('technician'), reportWorkIssue);


// 🧩 Get all works (admin/client view)
router.get('/getAllWork', protect, getAllWorks);

router.get('/issuetoadmin',getAdminNotifications);

router.patch('/work/update-location',protect,updateLocation);

router.get('/track-technician/:workId',protect,trackTechnician)

router.get('/client-work/:workId',protect, authorize('client'),getClientWorkStatus)

module.exports = router;
