const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { protect, authorize } = require('../middleware/auth');

// GET semua log activity (khusus admin dan owner)
router.get('/', protect, authorize('admin', 'owner'), activityLogController.getAllLogs);

module.exports = router;
