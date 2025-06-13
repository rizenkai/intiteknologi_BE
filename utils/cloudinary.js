const cloudinary = require('cloudinary').v2;

cloudinary.config({
  // Jika pakai CLOUDINARY_URL, config otomatis dari env
});

module.exports = cloudinary;
