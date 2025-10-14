const { BloodRequest } = require('../models/blood_request_modal');
const { User, BLOOD_GROUPS } = require('../models/user_model');
const { sendNotificationToUser } = require('./firebase_service.js');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// S3 client configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
});

// Multer configuration for file uploads to S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const envFolder = process.env.ENV ? `${process.env.ENV}/` : '';
      const finalPath = `prescriptions/${envFolder}${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
      cb(null, finalPath);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, or PNG files are allowed!'), false);
    }
  }
});

// Controller to create a new blood request
const createRequest = async (req, res) => {
  try {
    const {
      requester,
      patientName,
      patientAge,
      patientSex,
      bloodGroup,
      unitsRequired,
      hospitalName,
      hospitalAddress,
      contactNumber,
      reason,
      location
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Doctor prescription is required.' });
    }

    if (!requester || !patientName || !patientAge || !patientSex || !bloodGroup || !unitsRequired || !hospitalName || !hospitalAddress || !contactNumber || !location) {
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

    const newRequest = new BloodRequest({
      requester,
      patientName,
      patientAge,
      patientSex,
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


// --- CORRECT & EFFICIENT: Function to get nearby requests using MongoDB's Aggregation ---
const getNearbyRequests = async (req, res) => {
    try {
        const { longitude, latitude, page = 1, limit = 10 } = req.query;

        if (!longitude || !latitude) {
            return res.status(400).json({ success: false, message: 'Longitude and latitude are required.' });
        }

        const long = parseFloat(longitude);
        const lat = parseFloat(latitude);

        if (isNaN(long) || isNaN(lat)) {
            return res.status(400).json({ success: false, message: 'Invalid longitude or latitude values.' });
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // This is the powerful MongoDB Aggregation Pipeline for geospatial queries.
        const aggregationPipeline = [
            // Stage 1: $geoNear MUST be the first stage. It uses the 2dsphere index to
            // efficiently find documents, sort them by distance, and add a 'distance' field.
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [long, lat] },
                    distanceField: "distance", // This field will contain the distance in meters.
                    spherical: true,
                    query: { status: 'ACTIVE' } // Filter for active requests at the earliest stage.
                }
            },
            // Stage 2: Join with the 'users' collection to get requester details.
            {
                $lookup: {
                    from: "users",
                    localField: "requester",
                    foreignField: "_id",
                    as: "requesterInfo"
                }
            },
            // Stage 3: Deconstruct the array created by $lookup.
            {
                $unwind: {
                    path: "$requesterInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
            // Stage 4: Reshape the output to be clean and exactly what the frontend needs.
            {
                $project: {
                    _id: 1,
                    patientName: 1,
                    patientAge: 1,
                    patientSex: 1,
                    bloodGroup: 1,
                    unitsRequired: 1,
                    hospitalName: 1,
                    hospitalAddress: 1,
                    createdAt: 1,
                    location: 1,
                    doctorPrescriptionUrl: 1,
                    distance: 1, // Include the distance calculated by $geoNear.
                    requester: {
                        _id: "$requesterInfo._id",
                        name: "$requesterInfo.name",
                        bloodGroup: "$requesterInfo.bloodGroup",
                    }
                }
            },
            // Stage 5 & 6: Apply pagination at the end.
            { $skip: skip },
            { $limit: limitNum }
        ];

        const requests = await BloodRequest.aggregate(aggregationPipeline);

        // --- FIX: Use an aggregation pipeline to get the total count correctly ---
        const countPipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [long, lat] },
                    distanceField: "distance",
                    spherical: true,
                    query: { status: 'ACTIVE' }
                }
            },
            {
                $count: 'totalRequests'
            }
        ];

        const countResult = await BloodRequest.aggregate(countPipeline);
        const totalRequests = countResult.length > 0 ? countResult[0].totalRequests : 0;

        res.status(200).json({
            success: true,
            data: {
                requests,
                currentPage: pageNum,
                totalPages: Math.ceil(totalRequests / limitNum),
                totalRequests,
            }
        });
        const notificationTitle = `Urgent Request: ${req.body.bloodGroupNeeded}`;
                const notificationBody = `A patient at ${req.body.hospitalName} needs your help.`;

                    await sendNotificationToUser(
                        '68e759df9f32964d58931b9f',
                        notificationTitle,
                        notificationBody,
                        { requestId: '68eb54339346e17811335e4a'} // Send request ID in data
                    );


    } catch (error) {
        console.error('Error fetching nearby requests:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.', error: error.message });
    }
};

module.exports = {
  createRequest,
  getNearbyRequests,
  upload
};

