const ActivityLog = require('../models/ActivityLog');

// GET: semua log, terbaru dulu
exports.getAllLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({})
      .sort({ timestamp: -1 })
      .populate('userId', 'username fullname role')
      .populate('documentId', 'title filePath');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activity logs', error: err.message });
  }
};

// Fungsi untuk mencatat aktivitas (bisa dipanggil dari controller lain)
exports.createLog = async ({ action, description, documentId, userId, username, userRole }) => {
  try {
    console.log('[ActivityLog] createLog called:', { action, description, documentId, userId, username, userRole });
    await ActivityLog.create({
      action,
      description,
      documentId,
      userId,
      username,
      userRole // pastikan ini ikut disimpan
    });
    console.log('[ActivityLog] Log saved successfully');
  } catch (err) {
    // Logging error ke server, tapi tidak mengganggu proses utama
    console.error('Failed to log activity:', err.message);
  }
};
