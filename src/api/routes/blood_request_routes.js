const express = require('express');
const router = express.Router();
const { createRequest,getNearbyRequests,upload,updateRequestStatus,getPrescriptionFile } = require('../controllers/blood_request_controller');

// Apply the upload.single('file') middleware here.
// The string 'file' MUST match the key you use in Postman's form-data for the file.
router.post('/request', upload.single('file'), createRequest);
router.get('/request',  getNearbyRequests);
router.get('/request/file/:fileKey(*)', getPrescriptionFile);
router.patch('/:requestId/status', updateRequestStatus);

module.exports = router;