const User = require('../models/user_model');
const connectDB = require('../../config/db');

// Connect to DB before processing requests
connectDB();

/**
 * @desc    Get a hello world message
 * @route   GET /api/hello
 */
const getHello = (req, res) => {
  res.status(200).json({ message: 'Hello from the structured API! 🎉' });
};

/**
 * @desc    Create a new user
 * @route   POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    const newUser = await User.create({ name, email });
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getHello,
  createUser,
};