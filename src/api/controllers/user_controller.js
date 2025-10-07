const User = require('../models/user_model');
const connectDB = require('../../config/db');

// Connect to DB before processing requests
connectDB();

/**
 * @desc    Get a hello world message and add a random user
 * @route   GET /api/hello
 */
const getHello = async (req, res) => {
  try {
    // Generate random user data
    const randomUser = {
      name: `User${Math.floor(Math.random() * 1000)}`,
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    };

    // Create user in DB
    const createdUser = await User.create(randomUser);

    res.status(200).json({
      message: 'Hello from the structured API! 🎉',
      userAdded: createdUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getHello,

};
