const express = require('express');
const router = express.Router();
const { registerUser,getUserCount } = require('../controllers/user_controller');

router.post('/register', registerUser);
router.get('/count',getUserCount)

module.exports = router;