const express = require('express');
const router = express.Router();
const inputController = require('../controllers/inputController');
const { verifyToken, isAdminOrStaff } = require('../middleware/auth');

// Semua routes memerlukan autentikasi dan hak akses admin/staff
router.use(verifyToken);
router.use(isAdminOrStaff);

// Routes untuk nilai input
router.get('/values', inputController.getAllValues);
router.get('/values/:id', inputController.getValueById);
router.post('/values', inputController.createValue);
router.put('/values/:id', inputController.updateValue);
router.delete('/values/:id', inputController.deleteValue);

module.exports = router;
