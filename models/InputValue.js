const mongoose = require('mongoose');

const inputValueSchema = new mongoose.Schema({
  // Field baru untuk kompatibilitas dengan skema lama
  name: {
    type: String,
    trim: true
  },
  typeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InputType'
  },
  // Field utama untuk skema baru
  value: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['mutuBahan', 'tipeBahan']
  },
  testType: {
    type: String,
    required: true,
    enum: ['Besi', 'Beton']
  }
}, { timestamps: true });

// Compound index to ensure unique values per category and test type
inputValueSchema.index({ value: 1, category: 1, testType: 1 }, { unique: true });

module.exports = mongoose.model('InputValue', inputValueSchema);
