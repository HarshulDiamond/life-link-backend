const { BloodRequest,REQUEST_STATUSES } = require('../models/blood_request_modal');
const { User, BLOOD_GROUPS } = require('../models/user_model');
const { sendNotificationToUser } = require('./firebase_service.js');
const multer = require('multer');
const multerS3 = require('multer-s3');

const path = require('path');
const mongoose = require('mongoose');

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 Client. Ensure your AWS credentials and region are in your environment variables.
const s3Client = new S3Client({ region: process.env.AWS_REGION });

/**
 * Generates a pre-signed URL for a private S3 object.
 */
const getPrescriptionFile = async (req, res) => {
    try {
        // The fileKey is the path to the file in S3 after the bucket name,
        // e.g., "prescriptions/dev/file-123.jpeg"
        const { fileKey } = req.params;

        if (!fileKey) {
            return res.status(400).json({ success: false, message: 'File key is required.' });
        }

        const bucketName = process.env.S3_BUCKET_NAME; // Your S3 bucket name from .env

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        // Create a URL that is valid for 5 minutes (300 seconds)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // Send the secure URL back to the Flutter client
        res.status(200).json({
            success: true,
            url: presignedUrl
        });

    } catch (error) {
        console.error('Error generating pre-signed URL:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching file URL.' });
    }
};

// In your Express router file, you would set up a route like this:
// router.get('/prescription/:fileKey(*)', getPrescriptionFile);
// The (*) is important as it allows the fileKey parameter to contain slashes ('/').
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
// Make sure to import Mongoose at the top of your file


const getNearbyRequests = async (req, res) => {
    try {
        // 1. Destructure userId from the query parameters.
        const { longitude, latitude, userId, page = 1, limit = 10 } = req.query;

        if (!longitude || !latitude) {
            return res.status(400).json({ success: false, message: 'Longitude and latitude are required.' });
        }

        const long = parseFloat(longitude);
        const lat = parseFloat(latitude);

        if (isNaN(long) || isNaN(lat)) {
            return res.status(400).json({ success: false, message: 'Invalid longitude or latitude values.' });
        }

        // --- MODIFICATION START ---

        // Create the base query object for the $geoNear stage.
        // This makes it easy to add more filters conditionally.
        const geoNearQuery = { status: 'ACTIVE' };

        // If a userId is provided, add a condition to exclude their own requests.
        if (userId) {
            // Good practice: Validate the provided userId to prevent errors.
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ success: false, message: 'Invalid userId format.' });
            }
            // Use the $ne (not equal) operator to filter out documents
            // where the 'requester' field matches the current user's ID.
            geoNearQuery.requester = { $ne: new mongoose.Types.ObjectId(userId) };
        }

        // --- MODIFICATION END ---

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const aggregationPipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [long, lat] },
                    distanceField: "distance",
                    spherical: true,
                    // 2. Use the dynamically built query object here.
                    query: geoNearQuery
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "requester",
                    foreignField: "_id",
                    as: "requesterInfo"
                }
            },
            {
                $unwind: {
                    path: "$requesterInfo",
                    preserveNullAndEmptyArrays: true
                }
            },
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
                    distance: 1,
                    requester: {
                        _id: "$requesterInfo._id",
                        name: "$requesterInfo.name",
                        bloodGroup: "$requesterInfo.bloodGroup",
                    }
                }
            },
            { $skip: skip },
            { $limit: limitNum }
        ];

        const requests = await BloodRequest.aggregate(aggregationPipeline);

        // Also apply the same filter to the count pipeline for accurate pagination.
        const countPipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [long, lat] },
                    distanceField: "distance",
                    spherical: true,
                    // 3. Use the same query object for the count.
                    query: geoNearQuery
                }
            },
            {
                $count: 'totalRequests'
            }
        ];

        const countResult = await BloodRequest.aggregate(countPipeline);
        const totalRequests = countResult.length > 0 ? countResult[0].totalRequests : 0;
  const notificationTitle = `Urgent Request: asd`;
                            const notificationBody = `A patient at asd needs your help.`;

                                await sendNotificationToUser(
                                    '68e759df9f32964d58931b9f',
                                    notificationTitle,
                                    notificationBody,
                                    { requestId: '68eb54339346e17811335e4a'} // Send request ID in data
                                );
        res.status(200).json({
            success: true,
            data: {
                requests,
                currentPage: pageNum,
                totalPages: Math.ceil(totalRequests / limitNum),
                totalRequests,
            }
        });



    } catch (error) {
        console.error('Error fetching nearby requests:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.', error: error.message });
    }
};

const updateRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;

        // 1. Validate Input
        if (!status) {
            return res.status(400).json({ success: false, message: 'New status is required.' });
        }
        if (!REQUEST_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${REQUEST_STATUSES.join(', ')}` });
        }
        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ success: false, message: 'Invalid Request ID format.' });
        }

        // 2. Find and update the request
        const request = await BloodRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Blood request not found.' });
        }

        request.status = status;
        const updatedRequest = await request.save();

        res.status(200).json({
            success: true,
            message: 'Request status updated successfully.',
            data: updatedRequest
        });

    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ success: false, message: 'Server error while updating status.' });
    }
};
module.exports = {
  createRequest,
  updateRequestStatus,
  getNearbyRequests,
  upload,
  getPrescriptionFile
};

