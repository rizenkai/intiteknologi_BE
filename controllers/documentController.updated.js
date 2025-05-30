const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');

// IMPORTANT: This file has been completely rewritten to fix document creation issues

// Create document manually (Admin only, no file upload) - FIXED VERSION
exports.createDocumentManual = async (req, res) => {
  console.log('DEBUG: createDocumentManual FIXED VERSION called');
  console.log('BODY:', req.body);
  
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only admin and staff can create documents manually' });
    }
    
    const { title, description, category, status, bp, kodeBahan, tipeBahan } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    // Placeholder values for required file fields
    const document = await Document.create({
      title,
      description: description || 'Dokumen baru',
      fileName: 'placeholder.txt',
      filePath: '/placeholder/path',
      fileType: 'text/plain',
      fileSize: 0,
      category: category || 'manual',
      status: status || 'pending',
      // Campos adicionales para materiales
      bp: bp || null,
      kodeBahan: kodeBahan || '',
      tipeBahan: tipeBahan || '',
      uploadedBy: req.user._id
    });
    
    res.status(201).json(document);
  } catch (error) {
    console.error('ERROR CREATING DOCUMENT:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all documents with pagination and filters
exports.getDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    let query = {};

    // Apply filters if they exist
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    // Regular users can only see completed/approved documents
    if (req.user.role === 'user') {
      query.status = { $in: ['completed', 'approved'] };
    }

    // Count total documents matching query
    const total = await Document.countDocuments(query);

    // Fetch documents with pagination
    const documents = await Document.find(query)
      .sort({ submissionDate: -1 })
      .skip(startIndex)
      .limit(limit);

    res.json({
      documents,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalDocuments: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload document (Admin only)
exports.uploadDocument = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can upload documents' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { title, description, category, status, documentId } = req.body;
    
    // If documentId is provided, update existing document with file
    if (documentId) {
      return await this.updateDocumentFile(req, res);
    }
    
    // Validate required fields for new document
    if (!title) {
      return res.status(400).json({ message: 'Document title is required' });
    }

    // Check if document with the same title already exists
    const existingDocument = await Document.findOne({ title: title.trim() });
    if (existingDocument) {
      // If file was uploaded, delete it to avoid orphaned files
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error deleting file for duplicate title:', err);
        }
      }
      return res.status(400).json({ message: 'Document with this title already exists.' });
    }

    // Get file information from multer
    const { filename, path: filePath, mimetype, size } = req.file;
    
    // Create relative path for storage in database
    const relativePath = filePath.split('uploads')[1];
    const storedPath = 'uploads' + relativePath;

    // Create new document
    const document = await Document.create({
      title: title.trim(),
      description: description || '',
      fileName: filename,
      filePath: storedPath,
      fileType: mimetype,
      fileSize: size,
      category: category || 'general',
      status: status || 'pending',
      uploadedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Delete uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file after upload error:', err);
      }
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update document file (Admin only)
exports.updateDocumentFile = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can update document files' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { documentId } = req.body;
    if (!documentId) {
      // If file was uploaded, delete it to avoid orphaned files
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error deleting file for missing document ID:', err);
        }
      }
      return res.status(400).json({ message: 'Document ID is required' });
    }

    // Find the document to update
    const document = await Document.findById(documentId);
    if (!document) {
      // If file was uploaded, delete it to avoid orphaned files
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error deleting file for non-existent document:', err);
        }
      }
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete old file if it exists and is not a placeholder
    if (document.filePath && document.filePath !== '/placeholder/path') {
      const oldFilePath = path.join(__dirname, '..', document.filePath);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Error deleting old file:', err);
        }
      }
    }

    // Get file information from multer
    const { filename, path: filePath, mimetype, size } = req.file;
    
    // Create relative path for storage in database
    const relativePath = filePath.split('uploads')[1];
    const storedPath = 'uploads' + relativePath;

    // Update document with new file information
    document.fileName = filename;
    document.filePath = storedPath;
    document.fileType = mimetype;
    document.fileSize = size;
    document.lastModified = new Date();
    
    // Save updated document
    await document.save();

    // Return updated document
    res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error updating document file:', error);
    
    // Delete uploaded file if there was an error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting file after update error:', err);
      }
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download document (All authenticated users)
exports.downloadDocument = async (req, res) => {
  try {
    console.log(`Download request for document ID: ${req.params.id} by user role: ${req.user.role}`);
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      console.log('Document not found');
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log(`Document found: ${document.title}, Status: ${document.status}`);

    // Regular users can only download completed/approved documents
    if (req.user.role === 'user' && !['completed', 'approved'].includes(document.status)) {
      console.log(`Access denied: User role ${req.user.role} cannot download document with status ${document.status}`);
      return res.status(403).json({ 
        message: 'You can only download documents that are completed or approved' 
      });
    }

    // Check if file exists and is not a placeholder
    if (!document.filePath || document.filePath === '/placeholder/path') {
      console.log('No file available for this document');
      return res.status(404).json({ message: 'No file available for this document' });
    }

    console.log(`File path from database: ${document.filePath}`);
    
    // Normalize the file path
    let filePath;
    if (document.filePath.startsWith('/')) {
      // Handle absolute path
      filePath = path.join(__dirname, '..', document.filePath.substring(1));
    } else {
      // Handle relative path
      filePath = path.join(__dirname, '..', document.filePath);
    }
    
    console.log(`Resolved file path: ${filePath}`);

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      console.log(`File not found at path: ${filePath}`);
      return res.status(404).json({ message: 'File not found on server' });
    }

    console.log('File exists, preparing download...');

    // Get file stats to check size
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName || 'document'}"`);
    res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file', error: err.message });
      }
    });
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update document status (Staff and Admin only)
exports.updateDocumentStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Not authorized to update document status' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      { status, lastModified: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update document (Admin and Staff)
exports.updateDocument = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only admin and staff can update documents' });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Extraer los campos que se pueden actualizar
    const { status, bp, kodeBahan, tipeBahan } = req.body;
    
    // Preparar objeto de actualización
    const updateData = {};
    
    // Actualizar status si está presente
    if (status) {
      updateData.status = status;
    }
    
    // Actualizar campos adicionales si el usuario es admin o staff
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      // Actualizar BP si está presente (puede ser null)
      if (bp !== undefined) {
        updateData.bp = bp;
      }
      
      // Actualizar Kode Bahan si está presente
      if (kodeBahan !== undefined) {
        updateData.kodeBahan = kodeBahan;
      }
      
      // Actualizar Tipe Bahan si está presente
      if (tipeBahan !== undefined) {
        updateData.tipeBahan = tipeBahan;
      }
    }
    
    // Actualizar fecha de última modificación
    updateData.lastModified = new Date();
    
    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete document (Admin only)
exports.deleteDocument = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete documents' });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Use deleteOne() instead of remove() which is deprecated
    await Document.deleteOne({ _id: req.params.id });
    
    // Also delete the file if it exists
    if (document.filePath && document.filePath !== '/placeholder/path') {
      const filePath = path.join(__dirname, '..', document.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ message: 'Document removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
