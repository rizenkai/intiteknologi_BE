const express = require('express');
const router = express.Router();
const { 
  getDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  updateDocumentStatus,
  createDocumentManual
} = require('../controllers/documentController');
// Legacy controller removed to avoid duplication
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/cloudinaryUpload');

// Get all documents (filtered by user role)
router.get('/', protect, getDocuments);

// Upload document with file (admin only)
router.post('/', protect, authorize('admin','staff'), upload.single('file'), uploadDocument);

// Create document manually without file (admin only)
router.post('/manual', protect, authorize('admin', 'staff'), createDocumentManual);

// Legacy route removed to avoid duplication

// Update document (admin and staff)
router.put('/:id', protect, authorize('admin', 'staff'), updateDocument);

// Delete document (admin and staff)
router.delete('/:id', protect, authorize('admin', 'staff'), deleteDocument);

// Download document (all authenticated users)
router.get('/:id/download', protect, downloadDocument);

// Update document status (admin and staff only)
router.patch('/:id/status', protect, authorize('admin', 'staff'), updateDocumentStatus);

module.exports = router;
