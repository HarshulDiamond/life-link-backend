const { BloodRequest } = require('../models/blood_request_modal');
const { User, BLOOD_GROUPS } = require('../models/user_model');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3'); // <-- Use AWS SDK v3
const path = require('path');

// --- AWS S3 v3 Configuration ---
// When running on AWS Lambda, the SDK automatically picks up credentials
// from the function's execution role. Explicitly passing them is not needed.
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    // No credentials needed here, they are inherited from the IAM role
});

// --- Multer-S3 Configuration ---
const upload = multer({
  storage: multerS3({
    s3: s3, // Pass the new v3 s3 client
    bucket: process.env.S3_BUCKET_NAME,
    // acl: 'public-read', // <-- This line is removed to comply with modern S3 policies
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // Add environment-specific folder
      const envFolder = process.env.ENV ? `${process.env.ENV}/` : '';
      const finalPath = `prescriptions/${envFolder}${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
      cb(null, finalPath);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// --- Controller Function to Create a Request (no changes needed in the logic) ---
const createRequest = async (req, res) => {
  try {
    const {
      requester,
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      hospitalAddress,
      contactNumber,
      reason,
      location
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Doctor prescription PDF is required.' });
    }

    // --- Validation ---
    if (!requester || !patientName || !bloodGroup || !unitsRequired || !hospitalName || !hospitalAddress || !contactNumber || !location) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const userExists = await User.findById(requester);
    if (!userExists) {
        return res.status(404).json({ success: false, message: 'Requester user not found.'});
    }

    if (!BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ success: false, message: 'Invalid blood group provided.' });
    }

    let parsedLocation;
    try {
        parsedLocation = JSON.parse(location);
        if (parsedLocation.type !== 'Point' || !Array.isArray(parsedLocation.coordinates) || parsedLocation.coordinates.length !== 2) {
            throw new Error();
        }
    } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid location data. Must be a valid GeoJSON Point string.' });
    }

    // --- Create and Save New Request ---
    const newRequest = new BloodRequest({
      requester,
      patientName,
      bloodGroup,
      unitsRequired,
      hospitalName,
      hospitalAddress,
      contactNumber,
      reason,
      location: parsedLocation,
      doctorPrescriptionUrl: req.file.location
    });

    const savedRequest = await newRequest.save();

    res.status(201).json({
      success: true,
      message: 'Blood request created successfully!',
      request: savedRequest
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }

    console.error('Error creating blood request:', error);
    res.status(500).json({ success: false, message: 'An unexpected server error occurred.', error: error.message });
  }
};

module.exports = {
  createRequest,
  upload
};

