// Script untuk menghapus semua data di ActivityLog
// Jalankan: node scripts/clearActivityLog.js

require('dotenv').config();
const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');

async function clearActivityLog() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await ActivityLog.deleteMany({});
    console.log(`Berhasil menghapus ${result.deletedCount} activity log.`);
    process.exit(0);
  } catch (error) {
    console.error('Gagal menghapus activity log:', error);
    process.exit(1);
  }
}

clearActivityLog();
