const { User, BLOOD_GROUPS } = require('../models/user_model');

const getUserCount = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments(); // counts all documents in the collection

    res.status(200).json({
      success: true,
      totalUsers,
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred.',
      error: error.message,
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, number, dob, sex, email, pincode, bloodGroup, location } = req.body;

    // --- Comprehensive Validation ---

    // 1. Check for required fields
    if (!name || !number || !dob || !sex || !email || !pincode || !bloodGroup || !location) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 2. Validate Blood Group
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood group. Allowed values: ' + BLOOD_GROUPS.join(', ')
      });
    }

    // 3. Validate Location (GeoJSON structure)
    if (!location.type || location.type !== 'Point' || !location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
        return res.status(400).json({ success: false, message: 'Invalid location data. Must be a valid GeoJSON Point.' });
    }

    // 4. Check if user with the same phone number already exists
    const existingUser = await User.findOne({ number });
    if (existingUser) {
      return res.status(409).json({ // 409 Conflict is more appropriate here
        success: false,
        message: 'A user with this phone number already exists.'
      });
    }

    // --- Create and Save User ---

    // Create a new user instance. Mongoose will automatically validate
    // the other fields (email, number, pincode) based on the schema's `match` properties.
    const newUser = new User({
      name,
      number,
      dob,
      sex,
      email,
      pincode,
      bloodGroup,
      location,
    });
    //longitude first then latitude

    // Save the new user to the database
    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      user: savedUser,
    });

  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }

    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.', error: error.message });
  }
};

module.exports = { registerUser,getUserCount };
