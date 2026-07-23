const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 * POST /api/register
 */
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the email already exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // 409 Conflict to indicate duplicate resource registration
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Create the new user. The pre-save hook in User schema will handle bcrypt password hashing.
    const newUser = new User({
      email,
      passwordHash: password
    });

    await newUser.save();

    // Respond with success. Do not send sensitive elements.
    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(`[Auth] Registration crash: ${error.stack}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Log in a user
 * POST /api/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user document
    const user = await User.findOne({ email });
    
    // Security Best Practice: Use a generic error response for login failures
    // to prevent user enumeration attacks.
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare passwords securely
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Issue standard, short-lived JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({ token });
  } catch (error) {
    console.error(`[Auth] Login crash: ${error.stack}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login
};
