const express = require('express');
const router = express.Router();
const { getHello } = require('../controllers/user_controller');

router.get('/hello', getHello);

module.exports = router;