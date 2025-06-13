const Document = require('../models/Document');
const path = require('path');
const fs = require('fs');
const generatePlaceholderId = require('../utils/generatePlaceholderId');
const activityLogController = require('./activityLogController');

// IMPORTANT: This file has been completely rewritten to fix document creation issues

// Create document manually (Admin only, no file upload) - FIXED VERSION
exports.createDocumentManual = async (req, res) => {
  console.log('DEBUG: createDocumentManual FIXED VERSION called');
  console.log('BODY:', req.body);
  
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only admin and staff can create documents manually' });
    }
    
    const { namaProyek, description, category, status, bp, kodeBahan, mutuBahan, tipeBahan, targetUser } = req.body;
    if (!namaProyek) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!targetUser) {
      return res.status(400).json({ message: 'Target user is required' });
    }
    
    // Parse inputSets (may come as JSON string when sent via FormData or URL-encoded)
    let parsedInputSets = req.body.inputSets;
    if (typeof parsedInputSets === 'string') {
      try {
        parsedInputSets = JSON.parse(parsedInputSets);
      } catch (err) {
        console.warn('Failed to parse inputSets JSON string:', err.message);
        parsedInputSets = [];
      }
    }
    
    // Fallback: if inputSets still empty, build from flat FormData keys like inputSets[0][bp]
    if ((!parsedInputSets || parsedInputSets.length === 0) && req.body) {
      const temp = {};
      Object.keys(req.body).forEach(key => {
        const m = key.match(/^inputSets\[(\d+)\]\[(\w+)\]$/);
        if (m) {
          const idx = parseInt(m[1], 10);
          const field = m[2];
          if (!temp[idx]) temp[idx] = {};
          temp[idx][field] = req.body[key];
        }
      });
      parsedInputSets = Object.values(temp);
    }
    
    // Placeholder values for required file fields
    // Jika dokumen manual/placeholder, filePath hanya angka (tanpa prefix /placeholder/)
    const placeholderId = await generatePlaceholderId();
    const document = await Document.create({
      namaProyek,
      inputSets: parsedInputSets,
      description: description || 'Dokumen baru',
      fileName: 'placeholder.txt',
      filePath: `/placeholder/${placeholderId}`,
      fileType: 'text/plain',
      fileSize: 0,
      category: category || 'manual',
      status: status || 'pending',
      // Campos adicionales para materiales
      bp: bp || null,
      kodeBahan: kodeBahan || '',
      mutuBahan: mutuBahan || '',
      tipeBahan: tipeBahan || '',
      uploadedBy: req.user._id,
      targetUser,
      placeholderId // Tambahkan placeholderId
    });
    // Log aktivitas pembuatan placeholder
    await activityLogController.createLog({
      action: 'create_placeholder',
      description: `${req.user.username} membuat placeholder ${placeholderId} (${namaProyek})`,
      documentId: document._id,
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role
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
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.search) {
      query.namaProyek = { $regex: req.query.search, $options: 'i' };
    }

    // For regular users, only show documents they can access
    if (req.user.role === 'user') {
      // Hilangkan filter status, user bisa lihat semua dokumen yang targetUser dia atau dokumen umum
      query.$or = [
        { targetUser: req.user._id },
        { targetUser: { $exists: false } },
        { targetUser: null }
      ];
    }
    // Untuk admin dan staff: tampilkan semua dokumen tanpa filter tambahan

    const documents = await Document.find(query)
      .populate('uploadedBy', 'username fullname')
      .populate('targetUser', 'username fullname')
      .sort({ submissionDate: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Document.countDocuments(query);

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

// Upload document (Admin and Staff)
exports.uploadDocument = async (req, res) => {
  try {
    // Allow admin and staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only admin and staff can upload documents' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { namaProyek, description, category, status, documentId } = req.body;
    
    // If documentId is provided, update existing document with file
    if (documentId) {
      return await exports.updateDocumentFile(req, res);
    }
    
    // --- Tambahan validasi: Jika judul sudah ada (placeholder), update dokumen lama, JANGAN buat dokumen baru ---
    // Pastikan namaProyek unik
    const existing = await Document.findOne({ namaProyek });
    if (existing) {
      // Jika dokumen sudah ada dan filePath-nya berupa angka (placeholder), update dokumen tersebut
      if (existing.filePath === '/placeholder') {
        // Simulasikan request update file dokumen lama
        req.body.documentId = existing._id.toString();
        return await exports.updateDocumentFile(req, res);
      } else {
        // Hapus file yang sudah diupload jika duplikat
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(409).json({ message: 'Document with this namaProyek already exists' });
      }
    }

    // Validate required fields
    if (!namaProyek) {
      return res.status(400).json({ message: 'Nama Proyek is required' });
    }
    // Pastikan namaProyek unik
    const existingDoc = await Document.findOne({ namaProyek });
    if (existingDoc) {
      // Hapus file yang sudah diupload jika duplikat
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({ message: 'Document with this namaProyek already exists' });
    }

    // Parse inputSets (may come as JSON string when sent via FormData or URL-encoded)
    let parsedInputSets2 = req.body.inputSets;
    if (typeof parsedInputSets2 === 'string') {
      try {
        parsedInputSets2 = JSON.parse(parsedInputSets2);
      } catch (err) {
        console.warn('Failed to parse inputSets JSON string:', err.message);
        parsedInputSets2 = [];
      }
    }
    
    // Fallback: if inputSets still empty, build from flat FormData keys like inputSets[0][bp]
    if ((!parsedInputSets2 || parsedInputSets2.length === 0) && req.body) {
      const tmp = {};
      Object.keys(req.body).forEach(key => {
        const m = key.match(/^inputSets\[(\d+)\]\[(\w+)\]$/);
        if (m) {
          const idx = parseInt(m[1], 10);
          const field = m[2];
          if (!tmp[idx]) tmp[idx] = {};
          tmp[idx][field] = req.body[key];
        }
      });
      parsedInputSets2 = Object.values(tmp);
    }
    
    const document = await Document.create({
      namaProyek,
      inputSets: parsedInputSets2,
      description: description || 'Dokumen baru',
      fileName: req.file.originalname,
      filePath: req.file.path, // Cloudinary URL
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      category: category || 'upload',
      status: status || 'completed',
      uploadedBy: req.user._id
    });
    // Log aktivitas upload file BARU (pertama kali)
    await activityLogController.createLog({
      action: 'upload_file',
      description: `${req.user.username} mengupload file dokumen baru (${namaProyek})`,
      documentId: document._id,
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role
    });
    res.status(201).json(document);
  } catch (error) {
    console.error('ERROR UPLOADING DOCUMENT:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update document file (Admin and Staff)
exports.updateDocumentFile = async (req, res) => {
  try {
    // Allow admin and staff
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only admin and staff can update document files' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const { documentId } = req.body;
    
    // Validate required fields
    if (!documentId) {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    // Find the document to update
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Cek: apakah filePath masih placeholder (angka saja)?
    const isFirstUpload = document.filePath === '/placeholder';

    // Update document with new file information from Cloudinary
    document.fileName = req.file.originalname;
    document.filePath = req.file.path; // Cloudinary URL
    document.fileType = req.file.mimetype;
    document.fileSize = req.file.size;
    document.lastModified = new Date();
    
    // Save updated document
    await document.save();

    // Log aktivitas: upload pertama atau replace file?
    if (isFirstUpload) {
      await activityLogController.createLog({
        action: 'upload_file',
        description: `${req.user.username} mengupload file dokumen baru (${document.namaProyek})`,
        documentId: document._id,
        userId: req.user._id,
        username: req.user.username,
        userRole: req.user.role
      });
    } else {
      await activityLogController.createLog({
        action: 'replace_file',
        description: `${req.user.username} mengganti file dokumen (${document.namaProyek}) dengan file baru`,
        documentId: document._id,
        userId: req.user._id,
        username: req.user.username,
        userRole: req.user.role
      });
    }

    // Return updated document
    res.status(200).json({
      success: true,
      message: 'Document file updated successfully',
      document
    });
  } catch (error) {
    console.error('Error updating document file:', error);
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

    console.log(`Document found: ${document.namaProyek}, Status: ${document.status}`);

    // Regular users can only download completed/approved documents
    if (req.user.role === 'user' && !['completed', 'approved'].includes(document.status)) {
      console.log(`Access denied: User role ${req.user.role} cannot download document with status ${document.status}`);
      return res.status(403).json({ 
        message: 'You can only download documents that are completed or approved' 
      });
    }

    // Cross-platform path normalization
    let normalizedPath = document.filePath.replace(/\\/g, '/'); // replace backslashes with slashes
    const filePath = path.join(__dirname, '..', normalizedPath);
    console.log('Resolved file path:', filePath, 'Exists:', fs.existsSync(filePath));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.fileType);
    // For CSV: force correct extension if fileType is csv
    if (document.fileType === 'text/csv' && !document.fileName.endsWith('.csv')) {
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
    }
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update document status (Staff and Admin only)
exports.updateDocumentStatus = async (req, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update document status' });
    }

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Staff can only update status
    if (req.user.role === 'staff') {
      if (Object.keys(req.body).length > 1 || !req.body.status) {
        return res.status(403).json({ message: 'Staff can only update document status' });
      }
    }

    const oldStatus = document.status;
    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    // Log aktivitas edit status
    if (req.body.status && req.body.status !== oldStatus) {
      await activityLogController.createLog({
        action: 'edit_status',
        description: `${req.user.username} mengubah status dokumen (${document.namaProyek}) dari ${oldStatus} ke ${req.body.status}`,
        documentId: document._id,
        userId: req.user._id,
        username: req.user.username,
        userRole: req.user.role
      });
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

    // Siapkan objek updateData agar hanya field yang diizinkan yang diupdate
    const updateData = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.bp !== undefined) updateData.bp = req.body.bp;
    if (req.body.kodeBahan !== undefined) updateData.kodeBahan = req.body.kodeBahan;
    if (req.body.mutuBahan !== undefined) updateData.mutuBahan = req.body.mutuBahan;
    if (req.body.tipeBahan !== undefined) updateData.tipeBahan = req.body.tipeBahan;
    if (req.body.targetUser !== undefined) updateData.targetUser = req.body.targetUser;
    updateData.lastModified = new Date();

    // Cek perubahan status untuk log activity
    const oldStatus = document.status;
    const updatedDocument = await Document.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    // Log jika status berubah
    if (req.body.status && req.body.status !== oldStatus) {
      await activityLogController.createLog({
        action: 'edit_status',
        description: `${req.user.username} mengubah status dokumen (${document.namaProyek}) dari ${oldStatus} ke ${req.body.status}`,
        documentId: document._id,
        userId: req.user._id,
        username: req.user.username,
        userRole: req.user.role
      });
    }
    res.json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete document (Admin and Staff)
exports.deleteDocument = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only admin and staff can delete documents' });
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
    // Log aktivitas hapus placeholder
    await activityLogController.createLog({
      action: 'delete_placeholder',
      description: `${req.user.username} menghapus placeholder/dokumen (${document.namaProyek})`,
      documentId: document._id,
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role
    });
    res.json({ message: 'Document removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Regular users can only download completed/approved documents
    if (req.user.role === 'user' && !['completed', 'approved'].includes(document.status)) {
      return res.status(403).json({ 
        message: 'You can only download documents that are completed or approved' 
      });
    }

    // Cross-platform path normalization
    let normalizedPath = document.filePath.replace(/\\/g, '/'); // replace backslashes with slashes
    const filePath = path.join(__dirname, '..', normalizedPath);
    console.log('Resolved file path:', filePath, 'Exists:', fs.existsSync(filePath));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('Content-Type', document.fileType);
    // For CSV: force correct extension if fileType is csv
    if (document.fileType === 'text/csv' && !document.fileName.endsWith('.csv')) {
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
    }
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
