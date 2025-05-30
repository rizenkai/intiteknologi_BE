const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { protect, authorize } = require('../middleware/auth');

// Endpoint sederhana untuk admin menambahkan dokumen baru (hanya title)
router.post('/add-document', protect, authorize('admin'), async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Judul dokumen diperlukan' });
    }
    
    // Buat dokumen baru dengan nilai default untuk field wajib
    const newDoc = new Document({
      title,
      description: 'Dokumen baru',
      fileName: 'no-file.txt',
      filePath: '/placeholder',
      fileType: 'text/plain',
      fileSize: 0,
      category: 'manual',
      status: 'pending',
      uploadedBy: req.user._id
    });
    
    // Simpan dokumen
    await newDoc.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Dokumen berhasil ditambahkan',
      document: newDoc
    });
  } catch (error) {
    console.error('ERROR ADDING DOCUMENT:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menambahkan dokumen', 
      error: error.message 
    });
  }
});

module.exports = router;
