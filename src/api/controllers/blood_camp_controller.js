const { BloodCamp } = require('../models/blood_camps_modal');
const { User } = require('../models/user_model');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { S3Client } = require('@aws-sdk/client-s3');

// S3 client configuration using environment variables
const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

// Multer middleware for handling optional image uploads to a 'camps' folder in S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const envFolder = process.env.ENV ? `${process.env.ENV}/` : '';
      const finalPath = `camps/${envFolder}camp-${uniqueSuffix}${path.extname(file.originalname)}`;
      cb(null, finalPath);
    },
  }),
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, or GIF files are allowed!'), false);
    }
  },
});

/**
 * Controller to create a new blood donation camp.
 */
const createCamp = async (req, res) => {
  try {
    const { name, venue, dateTime, organizerId } = req.body;

    // 1. Validate required fields
    if (!name || !venue || !dateTime || !organizerId) {
      return res.status(400).json({ success: false, message: 'Missing required fields: name, venue, dateTime, organizerId.' });
    }

    // 2. Verify that the organizer exists
    const organizerExists = await User.findById(organizerId);
    if (!organizerExists) {
        return res.status(404).json({ success: false, message: 'Organizer user not found.'});
    }

    // 3. Create the new camp object
    const newCamp = new BloodCamp({
      name,
      venue,
      dateTime,
      organizer: organizerId,
      // If a file was uploaded, req.file.location will contain the S3 URL
      imageUrl: req.file ? req.file.location : undefined,
    });

    const savedCamp = await newCamp.save();

    res.status(201).json({
      success: true,
      message: 'Blood donation camp created successfully!',
      data: savedCamp,
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }
    console.error('Error creating blood camp:', error);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
  }
};

module.exports = {
  createCamp,
  upload, // Export the multer middleware to use in the routes
};
