

const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, registerUser, getUserCount , updateFcmToken} = require('../controllers/user_controller');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerUser);
router.get('/user-count', getUserCount);
router.post('/update-fcm-token', updateFcmToken);

module.exports = router;