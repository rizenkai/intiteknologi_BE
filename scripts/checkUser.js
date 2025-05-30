require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({});
    console.log('\nAll users in database:');
    users.forEach(user => {
      console.log({
        id: user._id,
        username: user.username,
        role: user.role,
        passwordLength: user.password.length
      });
    });

    // Check specific user
    const adminUser = await User.findOne({ username: 'admin' });
    if (adminUser) {
      console.log('\nAdmin user found:', {
        id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        passwordHash: adminUser.password
      });
    } else {
      console.log('\nAdmin user not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUser();
