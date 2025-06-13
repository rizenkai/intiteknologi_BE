const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'documents', // semua file masuk folder ini di Cloudinary
    resource_type: 'raw', // pastikan semua file (pdf, docx, dll) diupload sebagai raw agar bisa diakses publik
    use_filename: true, // gunakan nama file asli
    unique_filename: false, // jangan random, biarkan nama file asli
    overwrite: true, // boleh overwrite jika nama sama
  },
});

const upload = multer({ storage });

module.exports = upload;
