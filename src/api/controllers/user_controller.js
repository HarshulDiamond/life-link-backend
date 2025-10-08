// user_controller.js
const User = require('../models/user_model');
const connectDB = require('../../config/db');

const getHello = async (req, res) => {
  try {
    // Make sure DB is connected
//    await connectDB();
    const randomUser = {
      name: `User${Math.floor(Math.random() * 1000)}`,
      email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    };

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

module.exports = { getHello };
