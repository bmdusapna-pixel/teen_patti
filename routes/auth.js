const express = require('express');
const { loginUser, registerGuest } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login
router.post('/login', loginUser);

// POST /auth/guest
router.post('/guest', registerGuest);

module.exports = router;