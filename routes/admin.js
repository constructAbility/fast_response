const express=require('express')
const router=express.Router()
const { protect, authorize } = require('../middelware/authMiddelware');

const {getAdminNotifications}=require('../controllers/admincontrooler')

// router.get('/issuetoadmin',getAdminNotifications);
// 



module.exports=router
