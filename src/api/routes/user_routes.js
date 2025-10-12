

const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, registerUser, getUserCount } = require('../controllers/user_controller');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerUser);
router.get('/user-count', getUserCount);

module.exports = router;