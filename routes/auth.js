const express = require('express');
const { loginUser, registerGuest, loginByUserId } = require('../controllers/authController');

const router = express.Router();

// POST /auth/login
router.post('/login', loginUser);

// POST /auth/guest
router.post('/guest', registerGuest);

router.post('/loginbyid', loginByUserId); // New route for login by user ID

module.exports = router;