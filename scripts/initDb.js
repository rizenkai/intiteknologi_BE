require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Document = require('../models/Document');

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Document.deleteMany({});
    console.log('Cleared existing data');

    // Create default users with simpler password hashing
    const salt = await bcrypt.genSalt(10);
    console.log('Generated salt:', salt);

    const defaultUsers = [
      {
        username: 'owner',
        fullname: 'System Owner',
        password: await bcrypt.hash('owner123', salt),
        role: 'owner'
      },
      {
        username: 'admin',
        fullname: 'System Admin',
        password: await bcrypt.hash('admin123', salt),
        role: 'admin'
      },
      {
        username: 'staff1',
        fullname: 'Staff User',
        password: await bcrypt.hash('staff123', salt),
        role: 'staff'
      },
      {
        username: 'user1',
        fullname: 'Regular User',
        password: await bcrypt.hash('user123', salt),
        role: 'user'
      }
    ];

    // Log created users
    console.log('Created users with passwords:', defaultUsers.map(u => ({ 
      username: u.username, 
      passwordHash: u.password 
    })));

    const createdUsers = await User.insertMany(defaultUsers);
    console.log('Created default users');

    // Create sample documents
    const sampleDocuments = [
      {
        title: 'Panduan Penggunaan Sistem',
        description: 'Dokumen panduan untuk pengguna baru',
        fileName: 'panduan.pdf',
        filePath: '/uploads/panduan.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'Panduan',
        status: 'completed',
        uploadedBy: createdUsers[1]._id // admin
      },
      {
        title: 'Template Dokumen',
        description: 'Template standar untuk dokumen baru',
        fileName: 'template.docx',
        filePath: '/uploads/template.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 512,
        category: 'Template',
        status: 'approved',
        uploadedBy: createdUsers[1]._id // admin
      },
      {
        title: 'Laporan Bulanan',
        description: 'Laporan aktivitas bulanan',
        fileName: 'laporan.xlsx',
        filePath: '/uploads/laporan.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 2048,
        category: 'Laporan',
        status: 'pending',
        uploadedBy: createdUsers[1]._id // admin
      }
    ];

    await Document.insertMany(sampleDocuments);
    console.log('Created sample documents');

    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initializeDatabase();
