const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  inputSets: {
    type: [
      {
        tipePengujian: { type: String, trim: true, default: '' },
        bp: { type: String, trim: true, default: '' },
        kodeBahan: { type: String, trim: true, default: '' },
        mutuBahan: { type: String, trim: true, default: '' },
        tipeBahan: { type: String, trim: true, default: '' },
        warna: { type: String, trim: true, default: '' }
      }
    ],
    default: []
  },
  namaProyek: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Campos adicionales para documentos de materiales
  bp: {
    type: Number, // Double para BP (Kg)
    default: null
  },
  kodeBahan: {
    type: String, // Varchar para Kode Bahan
    trim: true,
    default: ''
  },
  mutuBahan: {
    type: String,
    trim: true,
    default: ''
  },
  tipeBahan: {
    type: String, // Tipe Bahan (tidak lagi menggunakan enum)
    trim: true,
    default: ''
  },
  placeholderId: { 
    type: String, 
    unique: true, 
    sparse: true 
  }, // ID placeholder angka unik, hanya untuk dokumen placeholder
  fileName: {
    type: String,
    required: true
  },
  filePath: { 
    type: String, 
    required: true 
  }, // Path file asli (atau '/placeholder' jika belum ada file)
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'review', 'completed', 'approved', 'rejected'],
    default: 'pending'
  },
  category: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Update lastModified on save
documentSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Document', documentSchema);
