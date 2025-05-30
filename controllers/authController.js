const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Register user
exports.register = async (req, res) => {
  try {
    const { username, fullname, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      fullname,
      password,
      role
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('=== Login Attempt ===');
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers);

    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      console.log('Error: Missing credentials');
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    console.log('Searching for user:', username);

    // Check for user
    const user = await User.findOne({ username }).select('+password');
    console.log('Database query result:', {
      found: !!user,
      userId: user?._id,
      userRole: user?.role,
      hasPassword: !!user?.password
    });

    if (!user) {
      console.log('Error: User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    console.log('Comparing passwords...');
    console.log('Input password length:', password.length);
    console.log('Stored password hash:', user.password);

    const isMatch = await user.comparePassword(password);
    console.log('Password comparison result:', isMatch);

    if (!isMatch) {
      console.log('Error: Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    console.log('Login successful:', {
      userId: user._id,
      username: user.username,
      role: user.role,
      tokenGenerated: !!token
    });

    res.json({
      _id: user._id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
