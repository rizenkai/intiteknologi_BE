const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');

// Fungsi async: generate angka acak 3-5 digit dan pastikan unik di DB
async function generatePlaceholderId() {
  // 3 sampai 5 digit angka random
  const min = 100; // 3 digit
  const max = 99999; // 5 digit
  let unique = false;
  let id;
  while (!unique) {
    id = Math.floor(Math.random() * (max - min + 1)) + min;
    // Cek ke DB, pastikan belum ada dokumen dengan filePath = id (string)
    const exists = await Document.findOne({ filePath: id.toString() });
    if (!exists) unique = true;
  }
  return id;
}

module.exports = generatePlaceholderId;
