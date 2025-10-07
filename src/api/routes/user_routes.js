const express = require('express');
const router = express.Router();
const { getHello, createUser } = require('../controllers/user_controller');

router.get('/hello', getHello);
router.post('/users', createUser);

module.exports = router;