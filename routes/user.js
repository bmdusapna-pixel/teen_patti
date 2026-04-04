const express = require('express');
const { getProfile, getBalance } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /user/profile [Auth]
router.get('/profile', authenticateToken, getProfile);

// GET /user/balance [Auth]
router.get('/balance', authenticateToken, getBalance);

module.exports = router;