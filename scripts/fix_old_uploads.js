// Script untuk rename file di folder uploads agar sesuai dengan nama file di database
// Jalankan: node scripts/fix_old_uploads.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Document = require('../models/Document');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const docs = await Document.find({});
  let changed = 0;

  for (const doc of docs) {
    // Ambil nama file fisik (yang lama bisa acak), dan nama fileName (yang benar)
    const filePath = path.join(UPLOADS_DIR, path.basename(doc.filePath));
    const correctName = doc.fileName;
    const correctPath = path.join(UPLOADS_DIR, correctName);

    // Jika file fisik ada dan namanya tidak sama dengan fileName di DB, lakukan rename
    if (fs.existsSync(filePath) && path.basename(filePath) !== correctName) {
      if (!fs.existsSync(correctPath)) {
        fs.renameSync(filePath, correctPath);
        // Update path di database
        doc.filePath = 'uploads/' + correctName;
        await doc.save();
        changed++;
        console.log(`Renamed ${filePath} -> ${correctPath}`);
      } else {
        console.warn(`Target file already exists: ${correctPath}`);
      }
    }
  }

  console.log(`Done. Total files renamed: ${changed}`);
  process.exit(0);
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
