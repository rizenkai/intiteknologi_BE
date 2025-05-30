const Document = require('../models/Document');

// Create document manually (Admin only, no file upload)
exports.addNewDocument = async (req, res) => {
  console.log('==========================================');
  console.log('DEBUG: addNewDocument called');
  console.log('BODY:', req.body);
  console.log('USER:', req.user);
  
  try {
    console.log('USER ROLE:', req.user?.role);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create documents manually' });
    }
    
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    // Placeholder values for required file fields
    const document = await Document.create({
      title,
      description: '',
      fileName: 'placeholder.txt',
      filePath: '/placeholder/path',
      fileType: 'text/plain',
      fileSize: 0,
      category: 'manual',
      status: 'pending',
      uploadedBy: req.user._id
    });
    
    res.status(201).json(document);
  } catch (error) {
    console.error('ERROR CREATING DOCUMENT:');
    console.error(error);
    // Kirim pesan error yang lebih spesifik
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
  console.log('==========================================');
};
