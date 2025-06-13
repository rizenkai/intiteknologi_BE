const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'documents', // semua file masuk folder ini di Cloudinary
    resource_type: 'auto', // otomatis: pdf, image, dll
  },
});

const upload = multer({ storage });

module.exports = upload;
