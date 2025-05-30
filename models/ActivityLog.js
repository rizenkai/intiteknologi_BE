const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'create_placeholder',
      'edit_status',
      'delete_placeholder',
      'upload_file',
      'replace_file',
      'edit_file'
    ],
    required: true
  },
  description: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  userRole: { type: String }, // Tambahkan field role user
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
