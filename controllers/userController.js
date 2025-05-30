const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    // Admin, staff, dan owner bisa akses semua user
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }
    
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get current logged in user
exports.getCurrentUser = async (req, res) => {
  try {
    // User data is already available in req.user from the protect middleware
    // Return user data without password
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    // Only admin can access user details
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create new user (admin only)
exports.createUser = async (req, res) => {
  try {
    // Only admin can create users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create users' });
    }
    
    const { username, fullname, password, role } = req.body;
    
    // Validate input
    if (!username || !fullname || !password) {
      return res.status(400).json({ message: 'Please provide username, fullname, and password' });
    }
    
    // Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create user
    const user = await User.create({
      username,
      fullname,
      password,
      role: role || 'user' // Default to 'user' if role not provided
    });
    
    res.status(201).json({
      _id: user._id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    // Only admin can update users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update users' });
    }
    
    const { fullname, password, role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (fullname) user.fullname = fullname;
    if (role) user.role = role;
    
    // If password is provided, hash it before saving
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();
    
    // Return user without password
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      fullname: updatedUser.fullname,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete users' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting the last admin user
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user' });
      }
    }
    
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all users with role 'user' (for document assignment)
exports.getAllRegularUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Not authorized to access this resource' });
    }
    const users = await User.find({ role: 'user' }).select('_id username fullname');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
