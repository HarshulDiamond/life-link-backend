const express = require('express');
const router = express.Router();
const { createCamp, upload } = require('../controllers/blood_camp_controller');
// You would also import your authentication middleware here, e.g.:
// const { protect } = require('../middleware/auth_middleware');

// Route to create a new blood camp.
// The `upload.single('file')` middleware handles the optional image upload.
// 'file' must match the key used in the client-side form data.
// Applying `protect` middleware would ensure only authenticated users can create a camp.
router.post('/create', /* protect, */ upload.single('file'), createCamp);

module.exports = router;
