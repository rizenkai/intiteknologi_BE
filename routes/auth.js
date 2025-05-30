const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.post('/login', login);
router.post('/register', register);

// Get all regular users (for document assignment)
router.get('/regular-users', protect, authorize('admin', 'staff'), userController.getAllRegularUsers);

module.exports = router;
